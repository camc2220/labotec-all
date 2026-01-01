

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
public class LabOrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public LabOrdersController(AppDbContext db)
    {
        _db = db;
    }

    private bool IsStaff() => User.IsInRole("Admin") || User.IsInRole("Recepcion");

    [HttpGet]
    public async Task<ActionResult<PagedResult<LabOrderReadDto>>> Get(
        [FromQuery] Guid? patientId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var q = _db.LabOrders
            .AsNoTracking()
            .Include(o => o.Patient)
            .Include(o => o.Items)
                .ThenInclude(i => i.LabTest)
            .AsQueryable();

        var currentPatientId = User.GetPatientId();

        if (!IsStaff())
        {
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            q = q.Where(o => o.PatientId == currentPatientId.Value);
        }
        else
        {
            if (patientId.HasValue) q = q.Where(o => o.PatientId == patientId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status);

        if (from.HasValue)
            q = q.Where(o => o.CreatedAt >= from.Value);

        if (to.HasValue)
            q = q.Where(o => o.CreatedAt <= to.Value);

        var total = await q.CountAsync();

        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(o => new LabOrderReadDto(
                o.Id,
                o.PatientId,
                o.Patient.FullName,
                o.CreatedAt,
                o.Status,
                o.Notes,
                o.Items
                    .Select(i => new LabOrderItemReadDto(
                        i.Id,
                        i.LabTestId,
                        i.LabTest.Code,
                        i.LabTest.Name,
                        i.Status,
                        i.Price))
                    .ToList()
                    .AsReadOnly()))
            .ToListAsync();

        return Ok(new PagedResult<LabOrderReadDto>(data, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabOrderReadDto>> GetOne(Guid id)
    {
        var o = await _db.LabOrders
            .Include(x => x.Patient)
            .Include(x => x.Items)
                .ThenInclude(i => i.LabTest)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (o is null) return NotFound();

        if (!IsStaff())
        {
            if (!User.IsInRole("Paciente")) return Forbid();

            var currentPatientId = User.GetPatientId();
            if (!currentPatientId.HasValue) return Forbid();
            if (o.PatientId != currentPatientId.Value) return Forbid();
        }

        var dto = new LabOrderReadDto(
            o.Id,
            o.PatientId,
            o.Patient.FullName,
            o.CreatedAt,
            o.Status,
            o.Notes,
            o.Items
                .Select(i => new LabOrderItemReadDto(
                    i.Id,
                    i.LabTestId,
                    i.LabTest.Code,
                    i.LabTest.Name,
                    i.Status,
                    i.Price))
                .ToList()
                .AsReadOnly());

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<LabOrderReadDto>> Create([FromBody] LabOrderCreateDto dto)
    {
        if (dto.TestIds is null || !dto.TestIds.Any())
            return BadRequest("Debe seleccionar al menos una prueba.");

        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe.");

        var tests = await _db.LabTests
            .Where(t => dto.TestIds.Contains(t.Id) && t.Active)
            .ToListAsync();

        if (tests.Count != dto.TestIds.Distinct().Count())
            return BadRequest("Alguna de las pruebas seleccionadas no existe o está inactiva.");

        var order = new LabOrder
        {
            PatientId = dto.PatientId,
            CreatedAt = DateTime.UtcNow,
            Status = "Created",
            Notes = dto.Notes
        };

        foreach (var test in tests)
        {
            order.Items.Add(new LabOrderItem
            {
                LabTestId = test.Id,
                Status = "Pending",
                Price = test.DefaultPrice
            });
        }

        _db.LabOrders.Add(order);
        await _db.SaveChangesAsync();

        var o = await _db.LabOrders
            .Include(x => x.Patient)
            .Include(x => x.Items)
                .ThenInclude(i => i.LabTest)
            .FirstAsync(x => x.Id == order.Id);

        var dtoResult = new LabOrderReadDto(
            o.Id,
            o.PatientId,
            o.Patient.FullName,
            o.CreatedAt,
            o.Status,
            o.Notes,
            o.Items
                .Select(i => new LabOrderItemReadDto(
                    i.Id,
                    i.LabTestId,
                    i.LabTest.Code,
                    i.LabTest.Name,
                    i.Status,
                    i.Price))
                .ToList()
                .AsReadOnly());

        return CreatedAtAction(nameof(GetOne), new { id = o.Id }, dtoResult);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] LabOrderStatusUpdateDto dto)
    {
        var o = await _db.LabOrders.FindAsync(id);
        if (o is null) return NotFound();

        o.Status = dto.Status;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("items/{itemId:guid}/status")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> UpdateItemStatus(Guid itemId, [FromBody] LabOrderItemStatusUpdateDto dto)
    {
        var item = await _db.LabOrderItems.FindAsync(itemId);
        if (item is null) return NotFound();

        item.Status = dto.Status;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var o = await _db.LabOrders.FindAsync(id);
        if (o is null) return NotFound();

        _db.LabOrders.Remove(o);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
