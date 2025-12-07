using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Recepcion,Facturacion")]
public class LabTestsController : ControllerBase
{
    private readonly AppDbContext _db;
    public LabTestsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<LabTestReadDto>>> Get(
        [FromQuery] string? q,
        [FromQuery] bool? active,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var query = _db.LabTests.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(t =>
                t.Code.Contains(q) ||
                t.Name.Contains(q));
        }

        if (active.HasValue)
        {
            query = query.Where(t => t.Active == active.Value);
        }

        var total = await query.CountAsync();

        var data = await query
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(t => new LabTestReadDto(
                t.Id,
                t.Code,
                t.Name,
                t.DefaultUnit,
                t.DefaultPrice,
                t.Active))
            .ToListAsync();

        return Ok(new PagedResult<LabTestReadDto>(data, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabTestReadDto>> GetOne(Guid id)
    {
        var t = await _db.LabTests.FindAsync(id);
        if (t is null) return NotFound();

        return new LabTestReadDto(
            t.Id,
            t.Code,
            t.Name,
            t.DefaultUnit,
            t.DefaultPrice,
            t.Active);
    }

    [HttpPost]
    public async Task<ActionResult<LabTestReadDto>> Create([FromBody] LabTestCreateDto dto)
    {
        var exists = await _db.LabTests.AnyAsync(x => x.Code == dto.Code);
        if (exists) return Conflict("Ya existe una prueba con ese código.");

        var entity = new LabTest
        {
            Code = dto.Code,
            Name = dto.Name,
            DefaultUnit = dto.DefaultUnit,
            DefaultPrice = dto.DefaultPrice,
            Active = true
        };

        _db.LabTests.Add(entity);
        await _db.SaveChangesAsync();

        var result = new LabTestReadDto(
            entity.Id,
            entity.Code,
            entity.Name,
            entity.DefaultUnit,
            entity.DefaultPrice,
            entity.Active);

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] LabTestUpdateDto dto)
    {
        var t = await _db.LabTests.FindAsync(id);
        if (t is null) return NotFound();

        t.Name = dto.Name;
        t.DefaultUnit = dto.DefaultUnit;
        t.DefaultPrice = dto.DefaultPrice;
        t.Active = dto.Active;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var t = await _db.LabTests.FindAsync(id);
        if (t is null) return NotFound();

        // En vez de borrar físico, desactivamos.
        t.Active = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
