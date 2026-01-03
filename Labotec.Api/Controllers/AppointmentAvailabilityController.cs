
using System;
using System.Collections.Generic;
using System.Globalization;
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
[Route("api/appointments/availability")]
[Authorize(Roles = "Admin")]
public class AppointmentAvailabilityController : ControllerBase
{
    private readonly AppDbContext _db;
    public AppointmentAvailabilityController(AppDbContext db) => _db = db;

    private async Task<int> CountBlockingInHourBucket(DateTime bucketStartUtc)
    {
        var (startUtc, endUtc) = SchedulingRules.GetLocalHourBucketUtcRange(bucketStartUtc);

        return await _db.Appointments.AsNoTracking()
            .Where(a => a.ScheduledAt >= startUtc && a.ScheduledAt < endUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status))
            .CountAsync();
    }

    private static bool TryParseLocalDayTime(string day, string time, out DateTime localDt, out string error)
    {
        localDt = default;
        error = "";

        if (string.IsNullOrWhiteSpace(day) || string.IsNullOrWhiteSpace(time))
        {
            error = "Day y Time son requeridos.";
            return false;
        }

        // time esperado: "HH:00"
        var combined = $"{day}T{time}:00"; // "YYYY-MM-DDTHH:00:00"
        if (!DateTime.TryParseExact(combined, "yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out localDt))
        {
            error = "Formato inválido. Usa Day=YYYY-MM-DD y Time=HH:00.";
            return false;
        }

        // Forzamos exactitud por hora (local)
        if (localDt.Minute != 0 || localDt.Second != 0)
        {
            error = "Solo se permiten horas exactas (HH:00).";
            return false;
        }

        return true;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] int days = 30)
    {
        var rangeDays = days <= 0 ? 30 : Math.Min(days, 90);
        var defaultCapacity = await AppointmentAvailabilityHelper.GetDefaultCapacityAsync(_db);

        var customSlots = await _db.AppointmentAvailabilities
            .AsNoTracking()
            .ToListAsync();

        var todayLocal = SchedulingRules.ToLocal(DateTime.UtcNow).Date;
        var bucketSet = new HashSet<DateTime>(AppointmentAvailabilityHelper.BuildWorkingHourBuckets(todayLocal, rangeDays));

        foreach (var slot in customSlots)
            bucketSet.Add(AppointmentAvailabilityHelper.NormalizeBucketKey(slot.StartUtc));

        var buckets = bucketSet
            .Select(AppointmentAvailabilityHelper.NormalizeBucketKey)
            .Where(b => SchedulingRules.TryValidateBusinessHours(b, out _))
            .OrderBy(x => x)
            .ToList();

        if (buckets.Count == 0)
            return Ok(Array.Empty<AppointmentAvailabilityDto>());

        var bucketKeys = new HashSet<DateTime>(buckets);
        var customMap = customSlots
            .Select(slot => (Key: AppointmentAvailabilityHelper.NormalizeBucketKey(slot.StartUtc), Slot: slot))
            .Where(x => bucketKeys.Contains(x.Key))
            .ToDictionary(x => x.Key, x => x.Slot);

        var bookedByBucket = await AppointmentAvailabilityHelper.CountBookedByBucketAsync(
            _db,
            buckets.First(),
            buckets.Last().AddHours(1));

        var list = buckets.Select(raw =>
        {
            var startUtc = AppointmentAvailabilityHelper.NormalizeBucketKey(raw);
            var capacity = customMap.TryGetValue(startUtc, out var slot) ? slot.Slots : defaultCapacity;
            var booked = bookedByBucket.TryGetValue(startUtc, out var count) ? count : 0;
            var (day, time) = AppointmentAvailabilityHelper.ToLocalStrings(startUtc);

            return new AppointmentAvailabilityDto(
                customMap.TryGetValue(startUtc, out var current) ? current.Id : null,
                day,
                time,
                capacity,
                Math.Max(capacity - booked, 0),
                customMap.ContainsKey(startUtc)
            );
        }).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentAvailabilityDto>> CreateOrUpsert([FromBody] AppointmentAvailabilityUpsertDto dto)
    {
        if (!TryParseLocalDayTime(dto.Day, dto.Time, out var localDt, out var parseErr))
            return BadRequest(parseErr);

        if (dto.Slots < 0) return BadRequest("Slots no puede ser negativo.");

        // Convertimos a UTC y normalizamos al bucket de hora local
        var rawUtc = SchedulingRules.NormalizeToUtc(localDt);
        var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(rawUtc);

        // Respeta horario laboral
        if (!SchedulingRules.TryValidateBusinessHours(bucketStartUtc, out var errHours))
            return BadRequest(errHours);

        // Upsert por StartUtc
        var entity = await _db.AppointmentAvailabilities.FirstOrDefaultAsync(x => x.StartUtc == bucketStartUtc);

        if (entity is null)
        {
            entity = new AppointmentAvailability
            {
                Day = dto.Day,
                Time = dto.Time,
                StartUtc = bucketStartUtc,
                Slots = dto.Slots,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _db.AppointmentAvailabilities.Add(entity);
        }
        else
        {
            entity.Day = dto.Day;
            entity.Time = dto.Time;
            entity.Slots = dto.Slots;
            entity.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var booked = await CountBlockingInHourBucket(bucketStartUtc);

        return Ok(new AppointmentAvailabilityDto(
            entity.Id,
            entity.Day,
            entity.Time,
            entity.Slots,
            Math.Max(entity.Slots - booked, 0),
            true));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentAvailabilityUpsertDto dto)
    {
        if (!TryParseLocalDayTime(dto.Day, dto.Time, out var localDt, out var parseErr))
            return BadRequest(parseErr);

        if (dto.Slots < 0) return BadRequest("Slots no puede ser negativo.");

        var entity = await _db.AppointmentAvailabilities.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound();

        var rawUtc = SchedulingRules.NormalizeToUtc(localDt);
        var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(rawUtc);

        if (!SchedulingRules.TryValidateBusinessHours(bucketStartUtc, out var errHours))
            return BadRequest(errHours);

        var existsOther = await _db.AppointmentAvailabilities.AnyAsync(x => x.Id != id && x.StartUtc == bucketStartUtc);
        if (existsOther) return Conflict("Ya existe disponibilidad para ese día/hora.");

        entity.Day = dto.Day;
        entity.Time = dto.Time;
        entity.StartUtc = bucketStartUtc;
        entity.Slots = dto.Slots;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
