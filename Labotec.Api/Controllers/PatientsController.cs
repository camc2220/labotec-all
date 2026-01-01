
using System.Security.Claims;
using Labotec.Api.Auth;
using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
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
    private readonly IWebHostEnvironment _env;

    public PatientsController(AppDbContext db, UserManager<IdentityUser> userManager, IWebHostEnvironment env)
    {
        _db = db;
        _userManager = userManager;
        _env = env;
    }

    private bool IsStaffRead() =>
        User.IsInRole("Admin") || User.IsInRole("Recepcion") || User.IsInRole("Facturacion");

    private bool IsStaffWrite() =>
        User.IsInRole("Admin") || User.IsInRole("Recepcion");

    [HttpGet]
    public async Task<ActionResult<PagedResult<PatientReadDto>>> Get(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string sortDir = "asc")
    {
        var query = _db.Patients.AsNoTracking().AsQueryable();

        var currentPatientId = User.GetPatientId();

        if (!IsStaffRead())
        {
            if (!User.IsInRole("Paciente")) return Forbid();
            if (!currentPatientId.HasValue) return Forbid();

            query = query.Where(p => p.Id == currentPatientId.Value);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(p =>
                p.FullName.Contains(q) ||
                (p.DocumentId != null && p.DocumentId.Contains(q)));
        }

        var total = await query.CountAsync();

        var data = await query
            .ApplyOrdering(sortBy, sortDir)
            .ApplyPaging(page, pageSize)
            .Select(p => new PatientReadDto(
                p.Id,
                p.FullName,
                p.DocumentId,
                p.BirthDate,
                p.Email,
                p.Phone,
                p.UserId))
            .ToListAsync();

        return Ok(new PagedResult<PatientReadDto>(data, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PatientReadDto>> GetOne(Guid id)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        if (!IsStaffRead())
        {
            if (!User.IsInRole("Paciente")) return Forbid();

            var currentPatientId = User.GetPatientId();
            if (!currentPatientId.HasValue) return Forbid();
            if (p.Id != currentPatientId.Value) return Forbid();
        }

        return new PatientReadDto(p.Id, p.FullName, p.DocumentId, p.BirthDate, p.Email, p.Phone, p.UserId);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<ActionResult<PatientReadDto>> Create([FromBody] PatientCreateDto dto)
    {
        var entity = new Labotec.Api.Domain.Patient
        {
            FullName = dto.FullName,
            DocumentId = dto.DocumentId,
            BirthDate = dto.BirthDate,
            Email = dto.Email,
            Phone = dto.Phone
        };

        IdentityUser? user = null;

        if (!string.IsNullOrWhiteSpace(dto.UserName) && !string.IsNullOrWhiteSpace(dto.Password))
        {
            user = new IdentityUser
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

            entity.UserId = user.Id;
        }

        _db.Patients.Add(entity);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            if (user is not null)
            {
                await _userManager.DeleteAsync(user);
            }
            throw;
        }

        if (user is not null)
        {
            var claimResult = await _userManager.AddClaimAsync(
                user,
                new Claim(AppClaims.PatientId, entity.Id.ToString()));

            if (!claimResult.Succeeded)
            {
                _db.Patients.Remove(entity);
                await _db.SaveChangesAsync();
                await _userManager.DeleteAsync(user);
                return StatusCode(StatusCodes.Status500InternalServerError, claimResult.Errors);
            }
        }

        var result = new PatientReadDto(entity.Id, entity.FullName, entity.DocumentId, entity.BirthDate, entity.Email, entity.Phone, entity.UserId);
        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/create-user")]
    public async Task<ActionResult> CreateUser(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(patient.UserId))
            return BadRequest(new { message = "El paciente ya tiene un usuario asignado." });

        var userName = !string.IsNullOrWhiteSpace(patient.Email)
            ? patient.Email!
            : (!string.IsNullOrWhiteSpace(patient.DocumentId) ? patient.DocumentId : $"paciente-{Guid.NewGuid():N}");

        // ✅ Usar un solo default centralizado
        var tempPassword = PasswordDefaults.GenericPassword;

        var user = new IdentityUser
        {
            UserName = userName,
            Email = patient.Email
        };

        var createResult = await _userManager.CreateAsync(user, tempPassword);
        if (!createResult.Succeeded)
            return BadRequest(createResult.Errors);

        var roleResult = await _userManager.AddToRoleAsync(user, "Paciente");
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return StatusCode(StatusCodes.Status500InternalServerError, roleResult.Errors);
        }

        patient.UserId = user.Id;
        await _db.SaveChangesAsync();

        var claimResult = await _userManager.AddClaimAsync(user, new Claim(AppClaims.PatientId, patient.Id.ToString()));
        if (!claimResult.Succeeded)
        {
            patient.UserId = null;
            await _db.SaveChangesAsync();
            await _userManager.DeleteAsync(user);
            return StatusCode(StatusCodes.Status500InternalServerError, claimResult.Errors);
        }

        // ✅ Dev: te lo muestro para pruebas. Prod: NO.
        if (_env.IsDevelopment())
        {
            return Ok(new { userId = user.Id, userName = user.UserName, password = tempPassword });
        }

        return Ok(new { userId = user.Id, userName = user.UserName, message = "Usuario creado. Use ResetPassword para asignar una contraseña." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PatientUpdateDto dto)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        if (!IsStaffWrite())
        {
            if (!User.IsInRole("Paciente")) return Forbid();

            var currentPatientId = User.GetPatientId();
            if (!currentPatientId.HasValue) return Forbid();
            if (p.Id != currentPatientId.Value) return Forbid();
        }

        p.FullName = dto.FullName;
        p.BirthDate = dto.BirthDate;
        p.Email = dto.Email;
        p.Phone = dto.Phone;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Recepcion")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await _db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        _db.Remove(p);
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(p.UserId))
        {
            var user = await _userManager.FindByIdAsync(p.UserId);
            if (user is not null)
                await _userManager.DeleteAsync(user);
        }

        return NoContent();
    }
}
