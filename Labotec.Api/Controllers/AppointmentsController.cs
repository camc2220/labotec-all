/*
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

    private bool IsStaff() => User.IsInRole("Admin") || User.IsInRole("Recepcion");

    private string GetCurrentUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
           ?? string.Empty;

    private async Task<int> GetMaxPatientsPerHourAsync()
    {
        var max = await _db.SchedulingSettings.AsNoTracking()
            .Where(x => x.Id == 1)
            .Select(x => x.MaxPatientsPerHour)
            .FirstOrDefaultAsync();

        return max > 0 ? max : 10;
    }

    private async Task<int> CountBlockingInHourBucket(DateTime scheduledAtUtc, Guid? exceptId = null)
    {
        var (startUtc, endUtc) = SchedulingRules.GetLocalHourBucketUtcRange(scheduledAtUtc);

        var q = _db.Appointments.AsNoTracking()
            .Where(a => a.ScheduledAt >= startUtc && a.ScheduledAt < endUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status));

        if (exceptId.HasValue) q = q.Where(a => a.Id != exceptId.Value);

        return await q.CountAsync();
    }

    private async Task<bool> HasExactDuplicate(Guid patientId, DateTime scheduledAtUtc, Guid? exceptId = null)
    {
        var q = _db.Appointments.AsNoTracking()
            .Where(a => a.PatientId == patientId && a.ScheduledAt == scheduledAtUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status));

        if (exceptId.HasValue) q = q.Where(a => a.Id != exceptId.Value);

        return await q.AnyAsync();
    }

    private static void ApplyStatusChange(Domain.Appointment a, string newStatus, string actorUserId)
    {
        var now = DateTime.UtcNow;

        if (!AppointmentStatuses.CanTransition(a.Status, newStatus))
            throw new InvalidOperationException($"Transición inválida: {a.Status} -> {newStatus}");

        if (string.Equals(a.Status, newStatus, StringComparison.OrdinalIgnoreCase))
            return;

        a.Status = newStatus;

        if (newStatus == AppointmentStatuses.CheckedIn)
        {
            a.CheckedInAt ??= now;
            a.CheckedInByUserId ??= actorUserId;
        }
        else if (newStatus == AppointmentStatuses.InProgress)
        {
            a.StartedAt ??= now;
            a.StartedByUserId ??= actorUserId;
        }
        else if (newStatus == AppointmentStatuses.Completed)
        {
            a.CompletedAt ??= now;
            a.CompletedByUserId ??= actorUserId;
        }
        else if (newStatus == AppointmentStatuses.Canceled)
        {
            a.CanceledAt ??= now;
            a.CanceledByUserId ??= actorUserId;
        }
        else if (newStatus == AppointmentStatuses.NoShow)
        {
            a.NoShowAt ??= now;
            a.NoShowByUserId ??= actorUserId;
        }
    }

    private async Task<AppointmentReadDto> ReadDto(Guid id)
    {
        var dto = await _db.Appointments.AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.Id == id)
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .FirstAsync();

        return dto;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentReadDto>> GetOne(Guid id)
    {
        var currentPatientId = User.GetPatientId();

        var q = _db.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.Id == id);

        if (!IsStaff())
        {
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            q = q.Where(a => a.PatientId == currentPatientId.Value);
        }

        var dto = await q
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .FirstOrDefaultAsync();

        if (dto is null) return NotFound();
        return Ok(dto);
    }

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

        if (!IsStaff())
        {
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

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!AppointmentStatuses.All.Contains(status)) return BadRequest("Status inválido.");
            q = q.Where(a => a.Status == status);
        }

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

    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Create([FromBody] AppointmentCreateDto dto)
    {
        if (dto.PatientId == Guid.Empty) return BadRequest("PatientId es requerido");
        if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type es requerido");

        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

        var scheduledAtUtc = SchedulingRules.NormalizeToUtc(dto.ScheduledAt);

        if (!SchedulingRules.TryValidateNotPast(scheduledAtUtc, DateTime.UtcNow, out var errPast))
            return BadRequest(errPast);

        if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
            return BadRequest(errHours);

        var max = await GetMaxPatientsPerHourAsync();
        var count = await CountBlockingInHourBucket(scheduledAtUtc);
        if (count >= max)
            return Conflict($"Cupo lleno para esa hora. Máximo {max} pacientes por hora.");

        if (await HasExactDuplicate(dto.PatientId, scheduledAtUtc))
            return Conflict("Ya existe una cita para este paciente en esa misma fecha/hora.");

        var entity = new Domain.Appointment
        {
            PatientId = dto.PatientId,
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
            entity.Notes
        );

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentUpdateDto dto)
    {
        var a = await _db.Appointments.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type es requerido");
        if (!AppointmentStatuses.All.Contains(dto.Status)) return BadRequest("Status inválido.");

        var scheduledAtUtc = SchedulingRules.NormalizeToUtc(dto.ScheduledAt);
        var scheduledChanged = a.ScheduledAt != scheduledAtUtc;

        if (scheduledChanged)
        {
            if (!SchedulingRules.TryValidateNotPast(scheduledAtUtc, DateTime.UtcNow, out var errPast))
                return BadRequest(errPast);

            if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
                return BadRequest(errHours);
        }

        if (AppointmentStatuses.IsBlocking(dto.Status))
        {
            if (scheduledChanged)
            {
                var max = await GetMaxPatientsPerHourAsync();
                var count = await CountBlockingInHourBucket(scheduledAtUtc, exceptId: a.Id);
                if (count >= max)
                    return Conflict($"Cupo lleno para esa hora. Máximo {max} pacientes por hora.");

                if (await HasExactDuplicate(a.PatientId, scheduledAtUtc, exceptId: a.Id))
                    return Conflict("Ya existe una cita para este paciente en esa misma fecha/hora.");
            }
        }

        try
        {
            ApplyStatusChange(a, dto.Status, GetCurrentUserId());
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }

        a.ScheduledAt = scheduledAtUtc;
        a.Type = dto.Type.Trim();
        a.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/check-in")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> CheckIn(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.CheckedIn, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/start")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Start(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.InProgress, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/complete")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Complete(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.Completed, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/no-show")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> NoShow(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.NoShow, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/cancel")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Cancel(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.Canceled, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
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
// ✅ AppointmentsController.cs (reemplázalo COMPLETO)
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Labotec.Api.Common;
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

    private bool IsStaff() => User.IsInRole("Admin") || User.IsInRole("Recepcion");

    private string GetCurrentUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
           ?? string.Empty;

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

    // ✅ Primero busca cupo por disponibilidad (AppointmentAvailabilities). Si no existe, cae a SchedulingSettings.
    private async Task<int> GetMaxPatientsPerHourAsync(DateTime bucketStartUtc)
    {
        var slot = await _db.AppointmentAvailabilities.AsNoTracking()
            .Where(x => x.StartUtc == bucketStartUtc)
            .Select(x => (int?)x.Slots)
            .FirstOrDefaultAsync();

        if (slot.HasValue) // 0 es válido (bloquea)
            return slot.Value;

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

    // ✅ Duplicado por HORA (no por DateTime exacto)
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
    // HISTORIAL
    // =========================
    private void AddStatusHistory(Guid appointmentId, string fromStatus, string toStatus, string actorUserId, string? reason)
    {
        _db.Set<AppointmentStatusHistory>().Add(new AppointmentStatusHistory
        {
            AppointmentId = appointmentId,
            FromStatus = AppointmentStatuses.Normalize(fromStatus),
            ToStatus = AppointmentStatuses.Normalize(toStatus),
            ChangedAtUtc = DateTime.UtcNow,
            ChangedByUserId = string.IsNullOrWhiteSpace(actorUserId) ? null : actorUserId,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim()
        });
    }

    private void ApplyStatusChange(Appointment a, string newStatus, string actorUserId)
    {
        var now = DateTime.UtcNow;

        var from = AppointmentStatuses.Normalize(a.Status);
        var to = AppointmentStatuses.Normalize(newStatus);

        if (!AppointmentStatuses.CanTransition(from, to))
            throw new InvalidOperationException($"Transición inválida: {from} -> {to}");

        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
            return;

        // ✅ historial (forward)
        AddStatusHistory(a.Id, from, to, actorUserId, reason: null);

        a.Status = to;

        if (to == AppointmentStatuses.CheckedIn)
        {
            a.CheckedInAt ??= now;
            a.CheckedInByUserId ??= actorUserId;
        }
        else if (to == AppointmentStatuses.InProgress)
        {
            a.StartedAt ??= now;
            a.StartedByUserId ??= actorUserId;
        }
        else if (to == AppointmentStatuses.Completed)
        {
            a.CompletedAt ??= now;
            a.CompletedByUserId ??= actorUserId;
        }
        else if (to == AppointmentStatuses.Canceled)
        {
            a.CanceledAt ??= now;
            a.CanceledByUserId ??= actorUserId;
        }
        else if (to == AppointmentStatuses.NoShow)
        {
            a.NoShowAt ??= now;
            a.NoShowByUserId ??= actorUserId;
        }
    }

    // ✅ NUEVO: rollback real
    private void ApplyStatusRevert(Appointment a, string toStatus, string actorUserId, string reason)
    {
        var now = DateTime.UtcNow;

        var from = AppointmentStatuses.Normalize(a.Status);
        var to = AppointmentStatuses.Normalize(toStatus);

        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Reason es obligatorio para revertir.");

        if (!AppointmentStatuses.CanRevert(from, to))
            throw new InvalidOperationException($"Rollback inválido: {from} -> {to}");

        // NO permitir desde cerrados aquí
        if (from is "Canceled" or "NoShow")
            throw new InvalidOperationException("No se puede revertir una cita cerrada (Canceled/NoShow) desde este endpoint.");

        // ✅ historial (rollback) con reason
        AddStatusHistory(a.Id, from, to, actorUserId, reason);

        a.Status = to;

        // Limpieza de timestamps según a dónde vuelves
        if (to == AppointmentStatuses.Scheduled)
        {
            a.CheckedInAt = null;
            a.CheckedInByUserId = null;

            a.StartedAt = null;
            a.StartedByUserId = null;

            a.CompletedAt = null;
            a.CompletedByUserId = null;

            a.CanceledAt = null;
            a.CanceledByUserId = null;

            a.NoShowAt = null;
            a.NoShowByUserId = null;
        }
        else if (to == AppointmentStatuses.CheckedIn)
        {
            a.StartedAt = null;
            a.StartedByUserId = null;

            a.CompletedAt = null;
            a.CompletedByUserId = null;

            a.CanceledAt = null;
            a.CanceledByUserId = null;

            a.NoShowAt = null;
            a.NoShowByUserId = null;

            a.CheckedInAt ??= now;
            a.CheckedInByUserId ??= actorUserId;
        }
        else if (to == AppointmentStatuses.InProgress)
        {
            a.CompletedAt = null;
            a.CompletedByUserId = null;

            a.CanceledAt = null;
            a.CanceledByUserId = null;

            a.NoShowAt = null;
            a.NoShowByUserId = null;

            a.StartedAt ??= now;
            a.StartedByUserId ??= actorUserId;
        }
    }

    private async Task<AppointmentReadDto> ReadDto(Guid id)
    {
        var dto = await _db.Appointments.AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.Id == id)
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .FirstAsync();

        return dto;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentReadDto>> GetOne(Guid id)
    {
        var currentPatientId = User.GetPatientId();

        var q = _db.Appointments
            .AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.Id == id);

        if (!IsStaff())
        {
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            q = q.Where(a => a.PatientId == currentPatientId.Value);
        }

        var dto = await q
            .Select(a => new AppointmentReadDto(
                a.Id,
                a.PatientId,
                a.Patient.FullName,
                a.ScheduledAt,
                a.Type,
                a.Status,
                a.Notes))
            .FirstOrDefaultAsync();

        if (dto is null) return NotFound();
        return Ok(dto);
    }

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

        if (!IsStaff())
        {
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

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!AppointmentStatuses.All.Contains(status)) return BadRequest("Status inválido.");
            q = q.Where(a => a.Status == status);
        }

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

    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Create([FromBody] AppointmentCreateDto dto)
    {
        if (dto.PatientId == Guid.Empty) return BadRequest("PatientId es requerido");
        if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type es requerido");

        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient is null) return BadRequest("Paciente no existe");

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

        if (await HasHourDuplicate(dto.PatientId, scheduledAtUtc))
            return Conflict("Ya existe una cita para este paciente en esa misma hora.");

        await EnsureGenericAvailabilityAsync(scheduledAtUtc);

        var entity = new Appointment
        {
            PatientId = dto.PatientId,
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
            entity.Notes
        );

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentUpdateDto dto)
    {
        var a = await _db.Appointments.Include(x => x.Patient).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type es requerido");
        if (!AppointmentStatuses.All.Contains(dto.Status)) return BadRequest("Status inválido.");

        var rawUtc = SchedulingRules.NormalizeToUtc(dto.ScheduledAt);

        if (!TryValidateExactHour(rawUtc, out var errExactHour))
            return BadRequest(errExactHour);

        var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(rawUtc);
        var (currentBucketUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(a.ScheduledAt);
        var scheduledAtUtc = bucketStartUtc;

        var scheduledChanged = currentBucketUtc != bucketStartUtc;

        if (scheduledChanged)
        {
            if (!SchedulingRules.TryValidateNotPast(scheduledAtUtc, DateTime.UtcNow, out var errPast))
                return BadRequest(errPast);

            if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
                return BadRequest(errHours);
        }

        var newIsBlocking = AppointmentStatuses.IsBlocking(dto.Status);
        var oldIsBlocking = AppointmentStatuses.IsBlocking(a.Status);

        if (newIsBlocking && (scheduledChanged || !oldIsBlocking))
        {
            var max = await GetMaxPatientsPerHourAsync(scheduledAtUtc);
            var count = await CountBlockingInHourBucket(scheduledAtUtc, exceptId: a.Id);
            if (count >= max)
                return Conflict($"Cupo lleno para esa hora. Máximo {max} pacientes por hora.");

            if (await HasHourDuplicate(a.PatientId, scheduledAtUtc, exceptId: a.Id))
                return Conflict("Ya existe una cita para este paciente en esa misma hora.");
        }

        await EnsureGenericAvailabilityAsync(scheduledAtUtc);

        try
        {
            ApplyStatusChange(a, dto.Status, GetCurrentUserId());
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }

        a.ScheduledAt = scheduledAtUtc;
        a.Type = dto.Type.Trim();
        a.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/check-in")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> CheckIn(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.CheckedIn, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/start")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Start(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.InProgress, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/complete")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Complete(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.Completed, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/no-show")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> NoShow(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.NoShow, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    [HttpPut("{id:guid}/cancel")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Cancel(Guid id)
    {
        var a = await _db.Appointments.FindAsync(id);
        if (a is null) return NotFound();

        try { ApplyStatusChange(a, AppointmentStatuses.Canceled, GetCurrentUserId()); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
    }

    // 🔥 NUEVO: ROLLBACK ENDPOINT
    [HttpPut("{id:guid}/revert")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<AppointmentReadDto>> Revert(Guid id, [FromBody] AppointmentRevertDto body)
    {
        if (body is null) return BadRequest("Body requerido.");
        if (string.IsNullOrWhiteSpace(body.ToStatus)) return BadRequest("toStatus es requerido.");
        if (string.IsNullOrWhiteSpace(body.Reason)) return BadRequest("reason es requerido.");

        var a = await _db.Appointments.FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound();

        var from = AppointmentStatuses.Normalize(a.Status);
        var to = AppointmentStatuses.Normalize(body.ToStatus);

        // Solo se puede revertir hacia: Scheduled / CheckedIn / InProgress
        if (to is not (AppointmentStatuses.Scheduled or AppointmentStatuses.CheckedIn or AppointmentStatuses.InProgress))
            return BadRequest("toStatus inválido. Solo: Scheduled, CheckedIn, InProgress.");

        // No revertir cerradas
        if (from is AppointmentStatuses.Canceled or AppointmentStatuses.NoShow)
            return Conflict("Esta cita está cerrada (Canceled/NoShow). No se revierte aquí.");

        // Completed -> InProgress SOLO Admin
        if (from == AppointmentStatuses.Completed && !User.IsInRole("Admin"))
            return Forbid();

        if (!AppointmentStatuses.CanRevert(from, to))
            return Conflict($"Rollback inválido: {from} -> {to}");

        // Si vienes de NO-bloqueante a bloqueante (Completed -> InProgress), revalidar cupo/duplicado
        var fromBlocks = AppointmentStatuses.IsBlocking(from);
        var toBlocks = AppointmentStatuses.IsBlocking(to);

        if (!fromBlocks && toBlocks)
        {
            await EnsureGenericAvailabilityAsync(a.ScheduledAt);

            var max = await GetMaxPatientsPerHourAsync(a.ScheduledAt);
            var booked = await CountBlockingInHourBucket(a.ScheduledAt, exceptId: a.Id);
            if (booked >= max)
                return Conflict($"No hay cupo para reactivar la cita. Máximo {max} por hora.");

            if (await HasHourDuplicate(a.PatientId, a.ScheduledAt, exceptId: a.Id))
                return Conflict("El paciente ya tiene otra cita activa en esa misma hora.");
        }

        try
        {
            ApplyStatusRevert(a, to, GetCurrentUserId(), body.Reason);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }

        await _db.SaveChangesAsync();
        return Ok(await ReadDto(id));
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
