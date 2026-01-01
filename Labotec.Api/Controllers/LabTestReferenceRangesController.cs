
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/labtests")]
[Authorize(Roles = "Admin,Recepcion,Facturacion")]
public class LabTestReferenceRangesController : ControllerBase
{
    private readonly AppDbContext _db;

    public LabTestReferenceRangesController(AppDbContext db)
    {
        _db = db;
    }

    public record LabTestReferenceRangeCreateDto(
        string? Sex,
        int? AgeMinYears,
        int? AgeMaxYears,
        decimal? MinValue,
        decimal? MaxValue,
        string? TextRange,
        string? Unit,
        string? Notes,
        bool Active = true);

    public record LabTestReferenceRangeUpdateDto(
        string? Sex,
        int? AgeMinYears,
        int? AgeMaxYears,
        decimal? MinValue,
        decimal? MaxValue,
        string? TextRange,
        string? Unit,
        string? Notes,
        bool Active);

    public record LabTestReferenceRangeReadDto(
        Guid Id,
        Guid LabTestId,
        string? Sex,
        int? AgeMinYears,
        int? AgeMaxYears,
        decimal? MinValue,
        decimal? MaxValue,
        string? TextRange,
        string? Unit,
        string? Notes,
        bool Active);

    private static bool IsSexValid(string? sex)
    {
        if (string.IsNullOrWhiteSpace(sex)) return true;
        sex = sex.Trim().ToUpperInvariant();
        return sex is "M" or "F";
    }

    private static bool IsAgeValid(int? min, int? max)
    {
        if (min.HasValue && min.Value < 0) return false;
        if (max.HasValue && max.Value < 0) return false;
        if (min.HasValue && max.HasValue && min.Value > max.Value) return false;
        return true;
    }

    private static bool IsRangeValid(decimal? min, decimal? max)
    {
        if (min.HasValue && min.Value < 0) return false;
        if (max.HasValue && max.Value < 0) return false;
        if (min.HasValue && max.HasValue && min.Value > max.Value) return false;
        return true;
    }

    private static bool HasAnyReferenceValue(decimal? min, decimal? max, string? textRange)
    {
        if (!string.IsNullOrWhiteSpace(textRange)) return true;
        if (min.HasValue || max.HasValue) return true;
        return false;
    }

    [HttpGet("{labTestId:guid}/references")]
    public async Task<ActionResult<IEnumerable<LabTestReferenceRangeReadDto>>> GetForTest(Guid labTestId, [FromQuery] bool includeInactive = false)
    {
        var exists = await _db.LabTests.AnyAsync(t => t.Id == labTestId);
        if (!exists) return NotFound("La prueba no existe.");

        var q = _db.LabTestReferenceRanges
            .AsNoTracking()
            .Where(r => r.LabTestId == labTestId);

        if (!includeInactive)
            q = q.Where(r => r.Active);

        var data = await q
            .OrderBy(r => r.Sex)
            .ThenBy(r => r.AgeMinYears)
            .Select(r => new LabTestReferenceRangeReadDto(
                r.Id,
                r.LabTestId,
                r.Sex,
                r.AgeMinYears,
                r.AgeMaxYears,
                r.MinValue,
                r.MaxValue,
                r.TextRange,
                r.Unit,
                r.Notes,
                r.Active))
            .ToListAsync();

        return Ok(data);
    }

    [HttpPost("{labTestId:guid}/references")]
    public async Task<ActionResult<LabTestReferenceRangeReadDto>> Create(Guid labTestId, [FromBody] LabTestReferenceRangeCreateDto dto)
    {
        var test = await _db.LabTests.FirstOrDefaultAsync(t => t.Id == labTestId);
        if (test is null) return NotFound("La prueba no existe.");

        if (!IsSexValid(dto.Sex))
            return BadRequest("Sex debe ser 'M', 'F' o null.");

        if (!IsAgeValid(dto.AgeMinYears, dto.AgeMaxYears))
            return BadRequest("Rango de edad inválido (AgeMinYears <= AgeMaxYears y no negativos).");

        if (!IsRangeValid(dto.MinValue, dto.MaxValue))
            return BadRequest("Rango numérico inválido (MinValue <= MaxValue y no negativos).");

        if (!HasAnyReferenceValue(dto.MinValue, dto.MaxValue, dto.TextRange))
            return BadRequest("Debe indicar Min/Max o TextRange.");

        var entity = new LabTestReferenceRange
        {
            LabTestId = labTestId,
            Sex = string.IsNullOrWhiteSpace(dto.Sex) ? null : dto.Sex.Trim().ToUpperInvariant(),
            AgeMinYears = dto.AgeMinYears,
            AgeMaxYears = dto.AgeMaxYears,
            MinValue = dto.MinValue.HasValue ? decimal.Round(dto.MinValue.Value, 2) : null,
            MaxValue = dto.MaxValue.HasValue ? decimal.Round(dto.MaxValue.Value, 2) : null,
            TextRange = string.IsNullOrWhiteSpace(dto.TextRange) ? null : dto.TextRange.Trim(),
            Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            Active = dto.Active
        };

        _db.LabTestReferenceRanges.Add(entity);
        await _db.SaveChangesAsync();

        var read = new LabTestReferenceRangeReadDto(
            entity.Id,
            entity.LabTestId,
            entity.Sex,
            entity.AgeMinYears,
            entity.AgeMaxYears,
            entity.MinValue,
            entity.MaxValue,
            entity.TextRange,
            entity.Unit,
            entity.Notes,
            entity.Active);

        return CreatedAtAction(nameof(GetForTest), new { labTestId = labTestId }, read);
    }

    [HttpPut("references/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] LabTestReferenceRangeUpdateDto dto)
    {
        var entity = await _db.LabTestReferenceRanges.FirstOrDefaultAsync(r => r.Id == id);
        if (entity is null) return NotFound();

        if (!IsSexValid(dto.Sex))
            return BadRequest("Sex debe ser 'M', 'F' o null.");

        if (!IsAgeValid(dto.AgeMinYears, dto.AgeMaxYears))
            return BadRequest("Rango de edad inválido (AgeMinYears <= AgeMaxYears y no negativos).");

        if (!IsRangeValid(dto.MinValue, dto.MaxValue))
            return BadRequest("Rango numérico inválido (MinValue <= MaxValue y no negativos).");

        if (!HasAnyReferenceValue(dto.MinValue, dto.MaxValue, dto.TextRange))
            return BadRequest("Debe indicar Min/Max o TextRange.");

        entity.Sex = string.IsNullOrWhiteSpace(dto.Sex) ? null : dto.Sex.Trim().ToUpperInvariant();
        entity.AgeMinYears = dto.AgeMinYears;
        entity.AgeMaxYears = dto.AgeMaxYears;
        entity.MinValue = dto.MinValue.HasValue ? decimal.Round(dto.MinValue.Value, 2) : null;
        entity.MaxValue = dto.MaxValue.HasValue ? decimal.Round(dto.MaxValue.Value, 2) : null;
        entity.TextRange = string.IsNullOrWhiteSpace(dto.TextRange) ? null : dto.TextRange.Trim();
        entity.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim();
        entity.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        entity.Active = dto.Active;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("references/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.LabTestReferenceRanges.FirstOrDefaultAsync(r => r.Id == id);
        if (entity is null) return NotFound();

        // ✅ soft delete (no borrado físico)
        entity.Active = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
