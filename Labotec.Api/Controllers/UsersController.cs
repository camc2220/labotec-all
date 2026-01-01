

using Labotec.Api.Common;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AppDbContext _db;

    public UsersController(
        UserManager<IdentityUser> userManager,
        RoleManager<IdentityRole> roleManager,
        AppDbContext db)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _db = db;
    }

    private static string? PickPrimaryRole(System.Collections.Generic.IList<string> roles)
    {
        if (roles is null || roles.Count == 0) return null;

        string[] priority = { "Admin", "Recepcion", "Facturacion", "Paciente" };
        foreach (var p in priority)
        {
            var hit = roles.FirstOrDefault(r => string.Equals(r, p, StringComparison.OrdinalIgnoreCase));
            if (hit != null) return hit;
        }

        return roles[0];
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<UserReadDto>> Create([FromBody] UserCreateDto dto)
    {
        var user = new IdentityUser
        {
            UserName = dto.UserName,
            Email = dto.Email
        };

        var initialPassword = string.IsNullOrWhiteSpace(dto.Password)
            ? PasswordDefaults.GenericPassword
            : dto.Password;

        var createResult = await _userManager.CreateAsync(user, initialPassword);
        if (!createResult.Succeeded)
        {
            return BadRequest(createResult.Errors);
        }

        if (dto.Roles is not null)
        {
            var requestedRoles = dto.Roles.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            foreach (var role in requestedRoles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                {
                    await _userManager.DeleteAsync(user);
                    return BadRequest(new { message = $"El rol '{role}' no existe." });
                }
            }

            var addResult = await _userManager.AddToRolesAsync(user, requestedRoles);
            if (!addResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return BadRequest(addResult.Errors);
            }
        }

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, await ToReadDto(user));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<System.Collections.Generic.IEnumerable<UserReadDto>>> GetAll()
    {
        var users = await _userManager.Users
            .OrderBy(u => u.UserName)
            .ToListAsync();

        var result = new System.Collections.Generic.List<UserReadDto>(users.Count);
        foreach (var user in users)
        {
            result.Add(await ToReadDto(user));
        }

        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<object>> GetCurrent()
    {
        // ✅ robusto: a veces viene como NameIdentifier, a veces como "sub"
        var currentUserId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(currentUserId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(currentUserId);
        if (user is null)
        {
            return NotFound();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var patient = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == user.Id);

        return Ok(new
        {
            id = user.Id,
            userName = user.UserName,
            email = user.Email,
            roles = roles,                 // ✅ roles reales
            role = PickPrimaryRole(roles), // ✅ rol principal
            name = patient?.FullName ?? user.UserName,
            phone = patient?.Phone,
            document = patient?.DocumentId,
            patientId = patient?.Id
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("{id}")]
    public async Task<ActionResult<UserReadDto>> GetById(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        return Ok(await ToReadDto(user));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<UserReadDto>> Update(string id, [FromBody] UserUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.UserName))
        {
            user.UserName = dto.UserName;
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            user.Email = dto.Email;
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(updateResult.Errors);
        }

        if (dto.Roles is not null)
        {
            var requestedRoles = dto.Roles.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            foreach (var role in requestedRoles)
            {
                if (!await _roleManager.RoleExistsAsync(role))
                {
                    return BadRequest(new { message = $"El rol '{role}' no existe." });
                }
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            var rolesToRemove = currentRoles.Except(requestedRoles, StringComparer.OrdinalIgnoreCase);
            var rolesToAdd = requestedRoles.Except(currentRoles, StringComparer.OrdinalIgnoreCase);

            var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                return BadRequest(removeResult.Errors);
            }

            var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                return BadRequest(addResult.Errors);
            }
        }

        if (dto.Lockout.HasValue)
        {
            var lockoutEnd = dto.Lockout.Value
                ? DateTimeOffset.UtcNow.AddYears(100)
                : (DateTimeOffset?)null;

            var lockResult = await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);
            if (!lockResult.Succeeded)
            {
                return BadRequest(lockResult.Errors);
            }
        }

        return Ok(await ToReadDto(user));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var currentUserId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (currentUserId == id)
        {
            return BadRequest(new { message = "No puedes eliminar tu propia cuenta." });
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    [Authorize]
    [HttpPost("{id}/change-password")]
    public async Task<IActionResult> ChangePassword(string id, [FromBody] UserChangePasswordDto dto)
    {
        var currentUserId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (currentUserId != id)
        {
            return Forbid();
        }

        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        var changeResult = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!changeResult.Succeeded)
        {
            return BadRequest(changeResult.Errors);
        }

        return NoContent();
    }

    [Authorize]
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeOwnPassword([FromBody] UserChangePasswordDto dto)
    {
        var currentUserId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(currentUserId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(currentUserId);
        if (user is null)
        {
            return NotFound();
        }

        var changeResult = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!changeResult.Succeeded)
        {
            return BadRequest(changeResult.Errors);
        }

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] UserAdminChangePasswordDto? dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        var newPassword = string.IsNullOrWhiteSpace(dto?.NewPassword)
            ? PasswordDefaults.GenericPassword
            : dto!.NewPassword;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (!resetResult.Succeeded)
        {
            return BadRequest(resetResult.Errors);
        }

        return NoContent();
    }

    private async Task<UserReadDto> ToReadDto(IdentityUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var lockoutEnd = await _userManager.GetLockoutEndDateAsync(user);
        var isLocked = lockoutEnd.HasValue && lockoutEnd.Value.UtcDateTime > DateTime.UtcNow;

        return new UserReadDto(
            user.Id,
            user.UserName,
            user.Email,
            roles.ToList().AsReadOnly(),
            isLocked,
            lockoutEnd);
    }
}
