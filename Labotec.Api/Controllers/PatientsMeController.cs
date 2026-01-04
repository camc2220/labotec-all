
using System;
using System.Linq;
using System.Threading.Tasks;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/patients/me")]
[Authorize(Roles = "Paciente")]
public class PatientsMeController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsMeController(AppDbContext db)
    {
        _db = db;
    }

    private Task<int> GetDefaultMaxPatientsAsync()
        => AppointmentAvailabilityHelper.GetDefaultCapacityAsync(_db);

    private static bool TryValidateExactHour(DateTime utc, out string error)
    {
        if (utc.Minute != 0 || utc.Second != 0 || utc.Millisecond != 0)
        {
            error = "Solo se permiten horas exactas (HH:00). No se aceptan minutos.";
            return false;
        }

        error = string.Empty;
        return true;
    }

    private async Task<int> GetMaxPatientsPerHourAsync(DateTime bucketStartUtc)
    {
        var slot = await _db.AppointmentAvailabilities.AsNoTracking()
            .Where(x => x.StartUtc == bucketStartUtc)
            .Select(x => (int?)x.Slots)
            .FirstOrDefaultAsync();

        if (slot.HasValue) return slot.Value;

        return await GetDefaultMaxPatientsAsync();
    }

    private async Task EnsureGenericAvailabilityAsync(DateTime bucketStartUtc)
    {
        var defaultCapacity = await GetDefaultMaxPatientsAsync();
        await AppointmentAvailabilityHelper.EnsureGenericAvailabilityAsync(_db, bucketStartUtc, defaultCapacity);
    }

    private async Task<int> CountBlockingInHourBucket(DateTime scheduledAtBucketUtc, Guid? exceptId = null)
    {
        var (startUtc, endUtc) = SchedulingRules.GetLocalHourBucketUtcRange(scheduledAtBucketUtc);

        var q = _db.Appointments.AsNoTracking()
            .Where(a => a.ScheduledAt >= startUtc && a.ScheduledAt < endUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status));

        if (exceptId.HasValue) q = q.Where(a => a.Id != exceptId.Value);

        return await q.CountAsync();
    }

    private async Task<bool> HasHourDuplicate(Guid patientId, DateTime scheduledAtBucketUtc, Guid? exceptId = null)
    {
        var (startUtc, endUtc) = SchedulingRules.GetLocalHourBucketUtcRange(scheduledAtBucketUtc);

        var q = _db.Appointments.AsNoTracking()
            .Where(a => a.PatientId == patientId)
            .Where(a => a.ScheduledAt >= startUtc && a.ScheduledAt < endUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status));

        if (exceptId.HasValue) q = q.Where(a => a.Id != exceptId.Value);

        return await q.AnyAsync();
    }

    // =========================
    // APPOINTMENTS (ME)
    // =========================

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
            query = query.Where(a => a.ScheduledAt >= DateTime.UtcNow);

        var effectiveSortBy = string.IsNullOrWhiteSpace(sortBy) ? nameof(Appointment.ScheduledAt) : sortBy;

        var total = await query.CountAsync();

        var data = await query
            .ApplyOrdering(effectiveSortBy, sortDir)
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
    public async Task<ActionResult<AppointmentReadDto>> CreateAppointment([FromBody] AppointmentMeCreateDto dto)
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Type))
            return BadRequest("Type es requerido.");

        var patient = await _db.Patients.FindAsync(patientId.Value);
        if (patient is null) return BadRequest("Paciente no existe.");

        var rawUtc = SchedulingRules.NormalizeToUtc(dto.ScheduledAt);

        if (!TryValidateExactHour(rawUtc, out var errExactHour))
            return BadRequest(errExactHour);

        var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(rawUtc);
        var scheduledAtUtc = bucketStartUtc;

        if (!SchedulingRules.TryValidateNotPast(scheduledAtUtc, DateTime.UtcNow, out var errPast))
            return BadRequest(errPast);

        if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
            return BadRequest(errHours);

        var max = await GetMaxPatientsPerHourAsync(scheduledAtUtc);
        var count = await CountBlockingInHourBucket(scheduledAtUtc);
        if (count >= max)
            return Conflict($"Cupo lleno para esa hora. Máximo {max} pacientes por hora.");

        if (await HasHourDuplicate(patientId.Value, scheduledAtUtc))
            return Conflict("Ya tienes una cita en esa misma hora.");

        await EnsureGenericAvailabilityAsync(scheduledAtUtc);

        var entity = new Labotec.Api.Domain.Appointment
        {
            PatientId = patientId.Value,
            ScheduledAt = scheduledAtUtc,
            Type = dto.Type.Trim(),
            Notes = dto.Notes,
            Status = AppointmentStatuses.Scheduled
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

        return Ok(result);
    }

    [HttpPut("appointments/{id:guid}")]
    public async Task<IActionResult> UpdateAppointment(Guid id, [FromBody] AppointmentMeUpdateDto dto)
    {
        var patientId = User.GetPatientId();
        if (!patientId.HasValue) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Type))
            return BadRequest("Type es requerido.");

        var appointment = await _db.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id && a.PatientId == patientId.Value);

        if (appointment is null) return NotFound();

        if (!string.Equals(appointment.Status, AppointmentStatuses.Scheduled, StringComparison.OrdinalIgnoreCase))
            return BadRequest("Solo puedes modificar una cita cuando está en estado Scheduled.");

        var rawUtc = SchedulingRules.NormalizeToUtc(dto.ScheduledAt);

        if (!TryValidateExactHour(rawUtc, out var errExactHour))
            return BadRequest(errExactHour);

        var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(rawUtc);
        var scheduledAtUtc = bucketStartUtc;

        if (!SchedulingRules.TryValidateNotPast(scheduledAtUtc, DateTime.UtcNow, out var errPast))
            return BadRequest(errPast);

        if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
            return BadRequest(errHours);

        var max = await GetMaxPatientsPerHourAsync(scheduledAtUtc);
        var count = await CountBlockingInHourBucket(scheduledAtUtc, exceptId: appointment.Id);
        if (count >= max)
            return Conflict($"Cupo lleno para esa hora. Máximo {max} pacientes por hora.");

        if (await HasHourDuplicate(patientId.Value, scheduledAtUtc, exceptId: appointment.Id))
            return Conflict("Ya tienes otra cita en esa misma hora.");

        await EnsureGenericAvailabilityAsync(scheduledAtUtc);

        appointment.ScheduledAt = scheduledAtUtc;
        appointment.Type = dto.Type.Trim();
        appointment.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // =========================
    // RESULTS (ME)
    // =========================

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
                r.CreatedByName,
                r.ReleasedAt,
                r.PdfUrl))
            .ToListAsync();

        return Ok(new PagedResult<LabResultReadDto>(data, page, pageSize, total));
    }

    // =========================
    // INVOICES (ME)
    // =========================

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
            .Include(i => i.Items)
            .ThenInclude(ii => ii.LabTest)
            .Where(i => i.PatientId == patientId.Value);

        if (paid.HasValue) query = query.Where(i => i.Paid == paid.Value);
        if (from.HasValue) query = query.Where(i => i.IssuedAt >= from.Value);
        if (to.HasValue) query = query.Where(i => i.IssuedAt <= to.Value);

        var total = await query.CountAsync();

        var data = (await query
                .ApplyInvoiceOrdering(sortBy, sortDir)
                .ApplyPaging(page, pageSize)
                .ToListAsync())
            .Select(i => new InvoiceReadDto(
                i.Id,
                i.PatientId,
                i.Patient != null ? i.Patient.FullName : string.Empty,
                i.Number,
                i.Amount,
                i.IssuedAt,
                i.Paid,
                (i.Items ?? Array.Empty<Labotec.Api.Domain.InvoiceItem>()).AsEnumerable()
                    .Select(item => new InvoiceItemReadDto(
                        item.LabTestId,
                        item.LabTest != null ? item.LabTest.Code : string.Empty,
                        item.LabTest != null ? item.LabTest.Name : string.Empty,
                        item.Price))));

        return Ok(new PagedResult<InvoiceReadDto>(data, page, pageSize, total));
    }
}
