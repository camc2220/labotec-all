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
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AppointmentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppointmentReadDto>>> Get([FromQuery] Guid? patientId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? status)
    {
        var q = _db.Appointments.AsNoTracking().Include(a => a.Patient).AsQueryable();
        if (patientId.HasValue) q = q.Where(a => a.PatientId == patientId.Value);
        if (from.HasValue) q = q.Where(a => a.ScheduledAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.ScheduledAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(a => a.Status == status);
        var data = await q
            .OrderBy(a => a.ScheduledAt)
            .Select(a => new AppointmentReadDto(a.Id, a.PatientId, a.Patient.FullName, a.ScheduledAt, a.Type, a.Status, a.Notes))
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentReadDto>> GetOne(Guid id)
    {
        var a = await _db.Appointments.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound();
        return new AppointmentReadDto(a.Id, a.PatientId, a.Patient.FullName, a.ScheduledAt, a.Type, a.Status, a.Notes);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentReadDto>> Create([FromBody] AppointmentCreateDto dto)
    {
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var entity = new Appointment
        {
            PatientId = dto.PatientId,
            ScheduledAt = dto.ScheduledAt,
            Type = dto.Type,
            Notes = dto.Notes,
            Status = "Scheduled"
        };
        _db.Appointments.Add(entity);
        await _db.SaveChangesAsync();
        var result = new AppointmentReadDto(entity.Id, patient.Id, patient.FullName, entity.ScheduledAt, entity.Type, entity.Status, entity.Notes);
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentUpdateDto dto)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();
        a.ScheduledAt = dto.ScheduledAt;
        a.Type = dto.Type;
        a.Status = dto.Status;
        a.Notes = dto.Notes;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();
        _db.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
