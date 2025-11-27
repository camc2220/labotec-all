using System.Security.Claims;
using Labotec.Api.Auth;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<IdentityUser> _userManager;

    public PatientsController(AppDbContext db, UserManager<IdentityUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<PatientReadDto>>> Get([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? sortBy = null, [FromQuery] string sortDir = "asc")
    {
        var query = _db.Patients.AsNoTracking().AsQueryable();

        var currentPatientId = User.GetPatientId();
        if (currentPatientId.HasValue)
        {
            query = query.Where(p => p.Id == currentPatientId.Value);
        }
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => p.FullName.Contains(q) || p.DocumentId.Contains(q));

        var total = await query.CountAsync();
        var data = await query
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(p => new PatientReadDto(p.Id, p.FullName, p.DocumentId, p.BirthDate, p.Email, p.Phone, p.UserId))
            .ToListAsync();

        return Ok(new PagedResult<PatientReadDto>(data, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PatientReadDto>> GetOne(Guid id)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        var currentPatientId = User.GetPatientId();
        if (currentPatientId.HasValue && p.Id != currentPatientId.Value) return Forbid();
        return new PatientReadDto(p.Id, p.FullName, p.DocumentId, p.BirthDate, p.Email, p.Phone, p.UserId);
    }

    [HttpPost]
    public async Task<ActionResult<PatientReadDto>> Create([FromBody] PatientCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.UserName)) return BadRequest("Nombre de usuario es requerido");
        if (string.IsNullOrWhiteSpace(dto.Password)) return BadRequest("Contraseña es requerida");

        var user = new IdentityUser
        {
            UserName = dto.UserName,
            Email = dto.Email
        };

        var identityResult = await _userManager.CreateAsync(user, dto.Password);
        if (!identityResult.Succeeded)
        {
            return BadRequest(identityResult.Errors);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, "Paciente");
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return StatusCode(StatusCodes.Status500InternalServerError, roleResult.Errors);
        }

        var entity = new Domain.Patient
        {
            FullName = dto.FullName,
            DocumentId = dto.DocumentId,
            BirthDate = dto.BirthDate,
            Email = dto.Email,
            Phone = dto.Phone,
            UserId = user.Id
        };

        _db.Patients.Add(entity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            await _userManager.DeleteAsync(user);
            throw;
        }

        // AQUÍ ES CLAVE: Usamos AppClaims.PatientId que ahora vale "patientId" (minúscula)
        var claimResult = await _userManager.AddClaimAsync(user, new Claim(AppClaims.PatientId, entity.Id.ToString()));
        if (!claimResult.Succeeded)
        {
            _db.Patients.Remove(entity);
            await _db.SaveChangesAsync();
            await _userManager.DeleteAsync(user);
            return StatusCode(StatusCodes.Status500InternalServerError, claimResult.Errors);
        }

        var result = new PatientReadDto(entity.Id, entity.FullName, entity.DocumentId, entity.BirthDate, entity.Email, entity.Phone, entity.UserId);
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PatientUpdateDto dto)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        var currentPatientId = User.GetPatientId();
        if (currentPatientId.HasValue && p.Id != currentPatientId.Value) return Forbid();

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

        var currentPatientId = User.GetPatientId();
        if (currentPatientId.HasValue && p.Id != currentPatientId.Value) return Forbid();

        _db.Remove(p);
        await _db.SaveChangesAsync();

        var user = await _userManager.FindByIdAsync(p.UserId);
        if (user is not null)
        {
            await _userManager.DeleteAsync(user);
        }
        return NoContent();
    }
}