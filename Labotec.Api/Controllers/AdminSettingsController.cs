using System.ComponentModel.DataAnnotations;
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/Admin/Settings")]
[Authorize(Roles = "Admin")]
public class AdminSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminSettingsController(AppDbContext db) => _db = db;

    public record SchedulingSettingsReadDto(int MaxPatientsPerHour, DateTime UpdatedAtUtc);

    public record SchedulingSettingsUpdateDto([param: Range(1, 500)] int MaxPatientsPerHour);

    [HttpGet("scheduling")]
    public async Task<ActionResult<SchedulingSettingsReadDto>> GetScheduling()
    {
        var s = await _db.SchedulingSettings.FirstOrDefaultAsync(x => x.Id == 1);

        if (s is null)
        {
            s = new SchedulingSettings { Id = 1, MaxPatientsPerHour = 10, UpdatedAt = DateTime.UtcNow };
            _db.SchedulingSettings.Add(s);
            await _db.SaveChangesAsync();
        }

        return Ok(new SchedulingSettingsReadDto(s.MaxPatientsPerHour, s.UpdatedAt));
    }

    [HttpPut("scheduling")]
    public async Task<ActionResult<SchedulingSettingsReadDto>> UpdateScheduling([FromBody] SchedulingSettingsUpdateDto dto)
    {
        var s = await _db.SchedulingSettings.FirstOrDefaultAsync(x => x.Id == 1);

        if (s is null)
        {
            s = new SchedulingSettings { Id = 1 };
            _db.SchedulingSettings.Add(s);
        }

        s.MaxPatientsPerHour = dto.MaxPatientsPerHour;
        s.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new SchedulingSettingsReadDto(s.MaxPatientsPerHour, s.UpdatedAt));
    }
}
