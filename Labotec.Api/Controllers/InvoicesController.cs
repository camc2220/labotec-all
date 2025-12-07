using System.Globalization;
using System.Text;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public InvoicesController(AppDbContext db) => _db = db;

    private bool IsStaff() =>
        User.IsInRole("Admin") || User.IsInRole("Recepcion") || User.IsInRole("Facturacion");

    private static bool HasInvalidIssuedAt(DateTime? issuedAt) =>
        issuedAt.HasValue && (issuedAt.Value == default || issuedAt.Value.Year < 1900);

    private static bool TryNormalizeIssuedAt(DateTime? issuedAt, out DateTime normalized, DateTime? fallback = null)
    {
        var candidate = issuedAt ?? fallback ?? DateTime.UtcNow;

        if (HasInvalidIssuedAt(candidate))
        {
            candidate = DateTime.UtcNow;
        }

        if (HasInvalidIssuedAt(candidate))
        {
            normalized = default;
            return false;
        }

        normalized = DateTime.SpecifyKind(candidate, DateTimeKind.Utc);
        return true;
    }

    private static InvoiceReadDto ToReadDto(Invoice i)
    {
        var items = i.Items ?? Array.Empty<InvoiceItem>();

        return new InvoiceReadDto(
            i.Id,
            i.PatientId,
            i.Patient?.FullName ?? string.Empty,
            i.Number,
            i.Amount,
            i.IssuedAt,
            i.Paid,
            items.Select(item => new InvoiceItemReadDto(
                item.LabTestId,
                item.LabTest?.Code ?? string.Empty,
                item.LabTest?.Name ?? string.Empty,
                item.Price
            )));
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<InvoiceReadDto>>> Get(
        [FromQuery] Guid? patientId,
        [FromQuery] bool? paid,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var q = _db.Invoices
            .AsNoTracking()
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .ThenInclude(ii => ii.LabTest)
            .AsQueryable();
        var currentPatientId = User.GetPatientId();

        // ✅ Staff puede listar todas
        if (!IsStaff())
        {
            // ✅ No-staff: solo paciente, y SOLO si trae patientId
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            q = q.Where(i => i.PatientId == currentPatientId.Value);
        }
        else
        {
            if (patientId.HasValue) q = q.Where(i => i.PatientId == patientId.Value);
        }

        if (paid.HasValue) q = q.Where(i => i.Paid == paid.Value);
        if (from.HasValue) q = q.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) q = q.Where(i => i.IssuedAt <= to.Value);

        var total = await q.CountAsync();
        var orderBy = string.IsNullOrWhiteSpace(sortBy) ? nameof(Invoice.IssuedAt) : sortBy;

        var data = (await q
            .ApplyOrdering(orderBy, sortDir)
            .ApplyPaging(page, pageSize)
            .ToListAsync())
            .Select(i => ToReadDto(i));

        return Ok(new PagedResult<InvoiceReadDto>(data, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceReadDto>> GetOne(Guid id)
    {
        var invoice = await _db.Invoices
            .AsNoTracking()
            .Include(i => i.Patient)
            .Include(i => i.Items)
            .ThenInclude(ii => ii.LabTest)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null) return NotFound();

        if (!IsStaff())
        {
            var currentPatientId = User.GetPatientId();
            if (!currentPatientId.HasValue || invoice.PatientId != currentPatientId.Value)
            {
                return Forbid();
            }
        }

        return Ok(ToReadDto(invoice));
    }

    [HttpGet("print")]
    public async Task<IActionResult> Print(
        [FromQuery] Guid? patientId,
        [FromQuery] bool? paid,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var q = _db.Invoices.AsNoTracking().Include(i => i.Patient).AsQueryable();
        var currentPatientId = User.GetPatientId();

        if (!IsStaff())
        {
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();
            q = q.Where(i => i.PatientId == currentPatientId.Value);
        }
        else
        {
            if (patientId.HasValue) q = q.Where(i => i.PatientId == patientId.Value);
        }
        if (paid.HasValue) q = q.Where(i => i.Paid == paid.Value);
        if (from.HasValue) q = q.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) q = q.Where(i => i.IssuedAt <= to.Value);

        var orderBy = string.IsNullOrWhiteSpace(sortBy) ? nameof(Invoice.IssuedAt) : sortBy;

        var data = await q
            .ApplyOrdering(orderBy, sortDir)
            .Select(i => new
            {
                i.Id,
                i.PatientId,
                PatientName = i.Patient != null ? i.Patient.FullName : string.Empty,
                i.Number,
                i.Amount,
                i.IssuedAt,
                i.Paid
            })
            .ToListAsync();

        var rows = new List<IEnumerable<string?>>
        {
            new[] { "ID", "Paciente", "Número", "Monto", "Fecha", "Pagado" }
        };

        foreach (var item in data)
        {
            rows.Add(new[]
            {
                item.Id.ToString(),
                item.PatientName,
                item.Number,
                item.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                item.IssuedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                item.Paid ? "Sí" : "No"
            });
        }

        var csv = CsvBuilder.Build(rows);
        var bytes = Encoding.UTF8.GetBytes(csv);
        var fileName = $"facturas-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
        return File(bytes, "text/csv", fileName);
    }

    private async Task<(IReadOnlyCollection<InvoiceItem>, decimal?)> BuildItems(
        IEnumerable<InvoiceItemCreateDto> itemsDto,
        bool allowInactive = false)
    {
        var result = new List<InvoiceItem>();
        var labTestIds = itemsDto.Select(i => i.LabTestId).Distinct().ToList();

        var testsQuery = _db.LabTests.Where(t => labTestIds.Contains(t.Id));

        if (!allowInactive)
        {
            testsQuery = testsQuery.Where(t => t.Active);
        }

        var tests = await testsQuery.ToListAsync();

        if (tests.Count != labTestIds.Count)
        {
            return (Array.Empty<InvoiceItem>(), null);
        }

        foreach (var dto in itemsDto)
        {
            var test = tests.First(t => t.Id == dto.LabTestId);
            var price = dto.Price ?? test.DefaultPrice;
            if (!price.HasValue)
            {
                return (Array.Empty<InvoiceItem>(), null);
            }

            result.Add(new InvoiceItem
            {
                LabTestId = test.Id,
                Price = price.Value
            });
        }

        var total = result.Sum(i => i.Price);
        return (result, total);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] InvoiceCreateDto dto)
    {
        if (!TryNormalizeIssuedAt(dto.IssuedAt, out var issuedAt))
        {
            return BadRequest("Fecha de emisión inválida.");
        }

        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number);
        if (exists) return Conflict("Número de factura ya existe");

        if (dto.Items is null || !dto.Items.Any()) return BadRequest("Debe seleccionar al menos una prueba.");

        var (items, total) = await BuildItems(dto.Items);
        if (!items.Any()) return BadRequest("Alguna prueba no existe o no tiene precio configurado.");
        if (!total.HasValue) return BadRequest("Alguna prueba no existe o no tiene precio configurado.");

        var entity = new Invoice
        {
            PatientId = dto.PatientId,
            Number = dto.Number,
            Amount = total.Value,
            IssuedAt = issuedAt,
            Paid = dto.Paid,
            Items = items.ToList()
        };

        _db.Invoices.Add(entity);
        await _db.SaveChangesAsync();

        var result = await _db.Invoices
            .AsNoTracking()
            .Include(i => i.Patient)
            .Include(i => i.Items).ThenInclude(ii => ii.LabTest)
            .FirstAsync(i => i.Id == entity.Id);

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, ToReadDto(result));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<IActionResult> Update(Guid id, [FromBody] InvoiceUpdateDto dto)
    {
        var i = await _db.Invoices.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (i is null) return NotFound();

        if (!TryNormalizeIssuedAt(dto.IssuedAt, out var issuedAt, i.IssuedAt))
        {
            return BadRequest("Fecha de emisión inválida.");
        }

        if (i.Number != dto.Number)
        {
            var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number && x.Id != id);
            if (exists) return Conflict("Número de factura ya existe");
        }

        if (dto.Items is null || !dto.Items.Any()) return BadRequest("Debe seleccionar al menos una prueba.");

        var (items, total) = await BuildItems(dto.Items, allowInactive: true);
        if (!items.Any()) return BadRequest("Alguna prueba no existe o no tiene precio configurado.");
        if (!total.HasValue) return BadRequest("Alguna prueba no existe o no tiene precio configurado.");

        _db.InvoiceItems.RemoveRange(i.Items);

        i.Number = dto.Number;
        i.Amount = total.Value;
        i.IssuedAt = issuedAt;
        i.Paid = dto.Paid;
        i.Items = items.ToList();

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var i = await _db.Invoices.FindAsync(id);
        if (i is null) return NotFound();

        _db.Remove(i);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
