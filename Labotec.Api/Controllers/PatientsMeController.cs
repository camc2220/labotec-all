using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/patients/me")]
[Authorize]
public class PatientsMeController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsMeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("appointments")]
    public async Task<ActionResult<PagedResult<AppointmentReadDto>>> GetAppointments(
        [FromQuery] bool upcoming = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        var query = _db.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.PatientId == patientId.Value);

        if (upcoming)
        {
            query = query.Where(a => a.ScheduledAt >= DateTime.UtcNow);
        }

        var total = await query.CountAsync();
        var data = await query
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

    [HttpPost("appointments")]
    public async Task<ActionResult<AppointmentReadDto>> CreateAppointment([FromBody] AppointmentCreateDto dto)
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        var patient = await _db.Patients.FindAsync(patientId.Value);
        if (patient is null) return BadRequest("Paciente no existe");

        var entity = new Domain.Appointment
        {
            PatientId = patientId.Value,
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
            entity.Notes);

        return CreatedAtAction(nameof(GetAppointments), new { id = entity.Id }, result);
    }

    [HttpPut("appointments/{id:guid}")]
    public async Task<IActionResult> UpdateAppointment(Guid id, [FromBody] AppointmentUpdateDto dto)
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        var appointment = await _db.Appointments
            .Where(a => a.Id == id && a.PatientId == patientId.Value)
            .FirstOrDefaultAsync();

        if (appointment is null) return NotFound();

        appointment.ScheduledAt = dto.ScheduledAt;
        appointment.Type = dto.Type;
        appointment.Status = dto.Status;
        appointment.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("results")]
    public async Task<ActionResult<PagedResult<LabResultReadDto>>> GetResults(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? test,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        var query = _db.LabResults
            .AsNoTracking()
            .Include(r => r.Patient)
            .Where(r => r.PatientId == patientId.Value);

        if (from.HasValue) query = query.Where(r => r.ReleasedAt >= from.Value);
        if (to.HasValue) query = query.Where(r => r.ReleasedAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(test)) query = query.Where(r => r.TestName.Contains(test));

        var total = await query.CountAsync();
        var data = await query
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(r => new LabResultReadDto(
                r.Id,
                r.PatientId,
                r.Patient.FullName,
                r.TestName,
                r.ResultValue,
                r.Unit,
                r.ReleasedAt,
                r.PdfUrl))
            .ToListAsync();

        return Ok(new PagedResult<LabResultReadDto>(data, page, pageSize, total));
    }

    [HttpGet("invoices")]
    public async Task<ActionResult<PagedResult<InvoiceReadDto>>> GetInvoices(
        [FromQuery] bool? paid,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        var query = _db.Invoices
            .AsNoTracking()
            .Include(i => i.Patient)
            .Where(i => i.PatientId == patientId.Value);

        if (paid.HasValue) query = query.Where(i => i.Paid == paid.Value);
        if (from.HasValue) query = query.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) query = query.Where(i => i.IssuedAt <= to.Value);

        var total = await query.CountAsync();
        var data = await query
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(i => new InvoiceReadDto(
                i.Id,
                i.PatientId,
                i.Patient.FullName,
                i.Number,
                i.Amount,
                i.IssuedAt,
                i.Paid))
            .ToListAsync();

        return Ok(new PagedResult<InvoiceReadDto>(data, page, pageSize, total));
    }
}
