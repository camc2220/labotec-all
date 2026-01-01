using Labotec.Api.Data;
using Labotec.Api.Domain;
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
    public async Task<ActionResult<IEnumerable<InvoiceReadDto>>> Get([FromQuery] Guid? patientId, [FromQuery] bool? paid, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var q = _db.Invoices.AsNoTracking().Include(i => i.Patient).AsQueryable();
        if (patientId.HasValue) q = q.Where(i => i.PatientId == patientId.Value);
        if (paid.HasValue) q = q.Where(i => i.Paid == paid.Value);
        if (from.HasValue) q = q.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) q = q.Where(i => i.IssuedAt <= to.Value);

        var data = await q.OrderByDescending(i => i.IssuedAt)
            .Select(i => new InvoiceReadDto(i.Id, i.PatientId, i.Patient.FullName, i.Number, i.Amount, i.IssuedAt, i.Paid))
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceReadDto>> GetOne(Guid id)
    {
        var i = await _db.Invoices.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (i is null) return NotFound();
        return new InvoiceReadDto(i.Id, i.PatientId, i.Patient.FullName, i.Number, i.Amount, i.IssuedAt, i.Paid);
    }

    [HttpPost]
    public async Task<ActionResult<InvoiceReadDto>> Create([FromBody] InvoiceCreateDto dto)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var exists = await _db.Invoices.AnyAsync(x => x.Number == dto.Number);
        if (exists) return Conflict("Número de factura ya existe");

        var entity = new Invoice
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
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
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
    public async Task<IActionResult> Delete(Guid id)
    {
        var i = await _db.Invoices.FindAsync(id);
        if (i is null) return NotFound();
        _db.Remove(i);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
