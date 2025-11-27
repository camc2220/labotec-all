
using System.Security.Claims;
using System.Linq;
using Labotec.Api.Auth;
using Labotec.Api.Data;
using Labotec.Api.DTOs;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Labotec.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;
        private readonly JwtTokenService _jwt;
        private readonly AppDbContext _db;

        public AuthController(
            UserManager<IdentityUser> userManager,
            SignInManager<IdentityUser> signInManager,
            JwtTokenService jwt,
            AppDbContext db)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwt = jwt;
            _db = db;
        }

        // ===========================
        // REGISTRO
        // ===========================
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var user = new IdentityUser
            {
                UserName = dto.UserName,
                Email = dto.Email
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            var patient = new Patient
            {
                FullName = dto.FullName,
                DocumentId = dto.DocumentId,
                BirthDate = dto.BirthDate,
                Email = dto.Email,
                Phone = dto.Phone,
                UserId = user.Id
            };

            _db.Patients.Add(patient);

            try
            {
                await _db.SaveChangesAsync();
            }
            catch
            {
                await _userManager.DeleteAsync(user);
                throw;
            }

            var claimResult = await _userManager.AddClaimAsync(user, new Claim(AppClaims.PatientId, patient.Id.ToString()));
            if (!claimResult.Succeeded)
            {
                _db.Patients.Remove(patient);
                await _db.SaveChangesAsync();
                await _userManager.DeleteAsync(user);
                return StatusCode(StatusCodes.Status500InternalServerError, claimResult.Errors);
            }

            await _userManager.AddToRoleAsync(user, "Paciente");

            var token = await _jwt.CreateAsync(user, _userManager);
            return Ok(new { token, patientId = patient.Id });
        }

        // ===========================
        // LOGIN
        // ===========================
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _userManager.FindByNameAsync(dto.UserName);

            if (user is null)
            {
                return Unauthorized();
            }

            var result = await _signInManager.CheckPasswordSignInAsync(
                user,
                dto.Password,
                lockoutOnFailure: false
            );

            if (!result.Succeeded)
            {
                return Unauthorized();
            }

            var token = await _jwt.CreateAsync(user, _userManager);
            var roles = await _userManager.GetRolesAsync(user);
            var claims = await _userManager.GetClaimsAsync(user);
            var patientId = claims.FirstOrDefault(c => c.Type == AppClaims.PatientId)?.Value;

            var normalizedRole = roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase))
                ? "admin"
                : "patient";

            return Ok(new
            {
                token,
                user = new
                {
                    name = user.UserName,
                    role = normalizedRole,
                    patientId
                }
            });
        }
    }
}
