/*using System.Globalization;
using System.Text;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
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
        var q = _db.Invoices.AsNoTracking().Include(i => i.Patient).AsQueryable();
        var currentPatientId = User.GetPatientId();
        if (currentPatientId.HasValue)
        {
            q = q.Where(i => i.PatientId == currentPatientId.Value);
        }
        else if (patientId.HasValue)
        {
            q = q.Where(i => i.PatientId == patientId.Value);
        }
        if (paid.HasValue) q = q.Where(i => i.Paid == paid.Value);
        if (from.HasValue) q = q.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) q = q.Where(i => i.IssuedAt <= to.Value);

        var total = await q.CountAsync();
        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(i => new InvoiceReadDto(i.Id, i.PatientId, i.Patient.FullName, i.Number, i.Amount, i.IssuedAt, i.Paid))
            .ToListAsync();

        return Ok(new PagedResult<InvoiceReadDto>(data, page, pageSize, total));
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
        if (currentPatientId.HasValue)
        {
            q = q.Where(i => i.PatientId == currentPatientId.Value);
        }
        else if (patientId.HasValue)
        {
            q = q.Where(i => i.PatientId == patientId.Value);
        }
        if (paid.HasValue) q = q.Where(i => i.Paid == paid.Value);
        if (from.HasValue) q = q.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) q = q.Where(i => i.IssuedAt <= to.Value);

        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .Select(i => new
            {
                i.Id,
                i.PatientId,
                PatientName = i.Patient.FullName,
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

    [HttpPost]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] InvoiceCreateDto dto)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number);
        if (exists) return Conflict("Número de factura ya existe");

        var entity = new Domain.Invoice
        {
            PatientId = dto.PatientId,
            Number = dto.Number,
            Amount = dto.Amount,
            IssuedAt = dto.IssuedAt ?? DateTime.UtcNow,
            Paid = dto.Paid
        };
        _db.Invoices.Add(entity);
        await _db.SaveChangesAsync();

        var result = new InvoiceReadDto(entity.Id, patient.Id, patient.FullName, entity.Number, entity.Amount, entity.IssuedAt, entity.Paid);
        return CreatedAtAction(nameof(Create), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<IActionResult> Update(Guid id, [FromBody] InvoiceUpdateDto dto)
    {
        var i = await _db.Invoices.FindAsync(id);
        if (i is null) return NotFound();

        if (i.Number != dto.Number)
        {
            var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number && x.Id != id);
            if (exists) return Conflict("Número de factura ya existe");
        }

        i.Number = dto.Number;
        i.Amount = dto.Amount;
        i.IssuedAt = dto.IssuedAt;
        i.Paid = dto.Paid;

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
*/

using System.Globalization;
using System.Text;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
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
        var q = _db.Invoices.AsNoTracking().Include(i => i.Patient).AsQueryable();
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
        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(i => new InvoiceReadDto(i.Id, i.PatientId, i.Patient.FullName, i.Number, i.Amount, i.IssuedAt, i.Paid))
            .ToListAsync();

        return Ok(new PagedResult<InvoiceReadDto>(data, page, pageSize, total));
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

        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .Select(i => new
            {
                i.Id,
                i.PatientId,
                PatientName = i.Patient.FullName,
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

    [HttpPost]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] InvoiceCreateDto dto)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number);
        if (exists) return Conflict("Número de factura ya existe");

        var entity = new Domain.Invoice
        {
            PatientId = dto.PatientId,
            Number = dto.Number,
            Amount = dto.Amount,
            IssuedAt = dto.IssuedAt ?? DateTime.UtcNow,
            Paid = dto.Paid
        };

        _db.Invoices.Add(entity);
        await _db.SaveChangesAsync();

        var result = new InvoiceReadDto(entity.Id, patient.Id, patient.FullName, entity.Number, entity.Amount, entity.IssuedAt, entity.Paid);
        return CreatedAtAction(nameof(Create), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Facturacion")]
    public async Task<IActionResult> Update(Guid id, [FromBody] InvoiceUpdateDto dto)
    {
        var i = await _db.Invoices.FindAsync(id);
        if (i is null) return NotFound();

        if (i.Number != dto.Number)
        {
            var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number && x.Id != id);
            if (exists) return Conflict("Número de factura ya existe");
        }

        i.Number = dto.Number;
        i.Amount = dto.Amount;
        i.IssuedAt = dto.IssuedAt;
        i.Paid = dto.Paid;

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
