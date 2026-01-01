
using System;
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
    public async Task<ActionResult> GetAll()
    {
        var list = await _db.AppointmentAvailabilities
            .AsNoTracking()
            .OrderBy(x => x.Day).ThenBy(x => x.Time)
            .Select(x => new AppointmentAvailabilityDto(x.Id, x.Day, x.Time, x.Slots))
            .ToListAsync();

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

        return Ok(new AppointmentAvailabilityDto(entity.Id, entity.Day, entity.Time, entity.Slots));
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
