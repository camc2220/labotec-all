/*using Labotec.Api.Common;
using Labotec.Api.Data;
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
    public async Task<ActionResult<PagedResult<AppointmentReadDto>>> Get(
        [FromQuery] Guid? patientId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var q = _db.Appointments.AsNoTracking().Include(a => a.Patient).AsQueryable();
        var currentPatientId = User.GetPatientId();

        if (currentPatientId.HasValue)
        {
            q = q.Where(a => a.PatientId == currentPatientId.Value);
        }
        else if (patientId.HasValue)
        {
            q = q.Where(a => a.PatientId == patientId.Value);
        }

        if (from.HasValue) q = q.Where(a => a.ScheduledAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.ScheduledAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(a => a.Status == status);

        var total = await q.CountAsync();
        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .ToListAsync();

        return Ok(new PagedResult<AppointmentReadDto>(data, page, pageSize, total));
    }

    // ----------------------------------------------------
    // ? CORRECCIÓN IMPORTANTE ? Solo Admin y Recepción pueden crear
    // ----------------------------------------------------
    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Create([FromBody] AppointmentCreateDto dto)
    {
        var currentPatientId = User.GetPatientId();
        var requestedPatientId = dto.PatientId;

        if (currentPatientId.HasValue)
        {
            if (requestedPatientId != Guid.Empty && requestedPatientId != currentPatientId.Value)
                return Forbid();

            requestedPatientId = currentPatientId.Value;
        }

        var patient = await _db.Patients.FindAsync(requestedPatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var entity = new Domain.Appointment
        {
            PatientId = requestedPatientId,
            ScheduledAt = dto.ScheduledAt,
            Type = dto.Type,
            Notes = dto.Notes,
            Status = "Scheduled"
        };

        _db.Appointments.Add(entity);
        await _db.SaveChangesAsync();

        var result = new AppointmentReadDto(
            entity.Id,
            patient.Id,
            patient.FullName,
            entity.ScheduledAt,
            entity.Type,
            entity.Status,
            entity.Notes
        );

        return CreatedAtAction(nameof(Create), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Recepcion")]
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
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        _db.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
*/
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
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AppointmentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AppointmentReadDto>>> Get(
        [FromQuery] Guid? patientId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var q = _db.Appointments.AsNoTracking().Include(a => a.Patient).AsQueryable();

        var isStaff = User.IsInRole("Admin") || User.IsInRole("Recepcion") || User.IsInRole("Bioanalista");
        var currentPatientId = User.GetPatientId();

        // ✅ Staff puede listar todas
        if (!isStaff)
        {
            // ✅ No-staff: solo paciente, y SOLO si trae patientId
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            q = q.Where(a => a.PatientId == currentPatientId.Value);
        }
        else
        {
            if (patientId.HasValue)
                q = q.Where(a => a.PatientId == patientId.Value);
        }

        if (from.HasValue) q = q.Where(a => a.ScheduledAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.ScheduledAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(a => a.Status == status);

        var total = await q.CountAsync();
        var data = await q
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .ToListAsync();

        return Ok(new PagedResult<AppointmentReadDto>(data, page, pageSize, total));
    }

    // ✅ Staff crea citas aquí (pacientes usan /api/patients/me/appointments)
    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Create([FromBody] AppointmentCreateDto dto)
    {
        if (dto.PatientId == Guid.Empty) return BadRequest("PatientId es requerido");

        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var entity = new Domain.Appointment
        {
            PatientId = dto.PatientId,
            ScheduledAt = dto.ScheduledAt,
            Type = dto.Type,
            Notes = dto.Notes,
            Status = "Scheduled"
        };

        _db.Appointments.Add(entity);
        await _db.SaveChangesAsync();

        var result = new AppointmentReadDto(
            entity.Id,
            patient.Id,
            patient.FullName,
            entity.ScheduledAt,
            entity.Type,
            entity.Status,
            entity.Notes
        );

        return CreatedAtAction(nameof(Create), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Recepcion")]
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
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        _db.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
