using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/Admin/Availability")]
[Authorize(Roles = "Admin")]
public class AdminAvailabilityController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminAvailabilityController(AppDbContext db) => _db = db;

    public record AvailabilityUpsertDto(
        [param: Required] DateTime DateTime,
        [param: Range(0, 500)] int Capacity // 0 = cerrar/eliminar cupo
    );

    public record AvailabilityReadDto(
        DateTime StartUtc,
        DateTime StartLocal,
        int Capacity,
        int Booked,
        int Remaining
    );

    private string GetCurrentUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
           ?? string.Empty;

    private async Task<int> CountBookedAsync(DateTime startUtc, DateTime endUtc)
    {
        return await _db.Appointments.AsNoTracking()
            .Where(a => a.ScheduledAt >= startUtc && a.ScheduledAt < endUtc)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status))
            .CountAsync();
    }

    // Para que tu frontend no falle si usa POST o PUT
    [HttpPost]
    public Task<ActionResult<AvailabilityReadDto>> UpsertPost([FromBody] AvailabilityUpsertDto dto)
        => Upsert(dto);

    [HttpPut]
    public async Task<ActionResult<AvailabilityReadDto>> Upsert([FromBody] AvailabilityUpsertDto dto)
    {
        var scheduledAtUtc = SchedulingRules.NormalizeToUtc(dto.DateTime);

        // Respeta reglas de horario (incluye bloqueo 12pm)
        if (!SchedulingRules.TryValidateBusinessHours(scheduledAtUtc, out var errHours))
            return BadRequest(errHours);

        var (startUtc, endUtc) = SchedulingRules.GetLocalHourBucketUtcRange(scheduledAtUtc);

        var slot = await _db.AvailabilitySlots.FirstOrDefaultAsync(x => x.StartUtc == startUtc);

        if (dto.Capacity == 0)
        {
            if (slot is not null)
            {
                _db.AvailabilitySlots.Remove(slot);
                await _db.SaveChangesAsync();
            }
            return Ok(new AvailabilityReadDto(startUtc, SchedulingRules.ToLocal(startUtc), 0, 0, 0));
        }

        if (slot is null)
        {
            slot = new AvailabilitySlot { StartUtc = startUtc };
            _db.AvailabilitySlots.Add(slot);
        }

        slot.Capacity = dto.Capacity;
        slot.UpdatedAtUtc = DateTime.UtcNow;
        slot.UpdatedByUserId = GetCurrentUserId();

        await _db.SaveChangesAsync();

        var booked = await CountBookedAsync(startUtc, endUtc);
        var remaining = Math.Max(0, slot.Capacity - booked);

        return Ok(new AvailabilityReadDto(
            startUtc,
            SchedulingRules.ToLocal(startUtc),
            slot.Capacity,
            booked,
            remaining
        ));
    }
}
