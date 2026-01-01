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
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PatientsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientReadDto>>> Get([FromQuery] string? q)
    {
        var query = _db.Patients.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => p.FullName.Contains(q) || p.DocumentId.Contains(q));
        var data = await query
            .OrderBy(p => p.FullName)
            .Select(p => new PatientReadDto(p.Id, p.FullName, p.DocumentId, p.BirthDate, p.Email, p.Phone))
            .ToListAsync();
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PatientReadDto>> GetOne(Guid id)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();
        return new PatientReadDto(p.Id, p.FullName, p.DocumentId, p.BirthDate, p.Email, p.Phone);
    }

    [HttpPost]
    public async Task<ActionResult<PatientReadDto>> Create([FromBody] PatientCreateDto dto)
    {
        var entity = new Patient
        {
            FullName = dto.FullName,
            DocumentId = dto.DocumentId,
            BirthDate = dto.BirthDate,
            Email = dto.Email,
            Phone = dto.Phone
        };
        _db.Patients.Add(entity);
        await _db.SaveChangesAsync();
        var result = new PatientReadDto(entity.Id, entity.FullName, entity.DocumentId, entity.BirthDate, entity.Email, entity.Phone);
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PatientUpdateDto dto)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();
        p.FullName = dto.FullName;
        p.BirthDate = dto.BirthDate;
        p.Email = dto.Email;
        p.Phone = dto.Phone;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();
        _db.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
