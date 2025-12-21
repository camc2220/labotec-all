/*
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

        private static string DeriveUserNameFromEmail(string email)
        {
            var atIndex = email.IndexOf('@');
            return atIndex > 0 ? email[..atIndex] : email;
        }

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
            var email = dto.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest("El correo electrónico es obligatorio.");
            }

            var documentId = dto.DocumentId?.Trim();
            if (!IsValidDocumentId(documentId))
            {
                return BadRequest("La cédula/ID debe contener exactamente 11 dígitos.");
            }

            var derivedUserName = DeriveUserNameFromEmail(email);
            if (string.IsNullOrWhiteSpace(derivedUserName))
            {
                return BadRequest("No se pudo generar un nombre de usuario a partir del correo.");
            }

            var existingUser = await _userManager.FindByNameAsync(derivedUserName);
            if (existingUser is not null)
            {
                return BadRequest($"Ya existe un usuario con el nombre {derivedUserName}.");
            }

            var user = new IdentityUser
            {
                UserName = derivedUserName,
                Email = email
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            var patient = new Patient
            {
                FullName = dto.FullName,
                DocumentId = documentId!,
                BirthDate = dto.BirthDate,
                Email = email,
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
*/
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Labotec.Api.Auth;
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        private static string DeriveUserNameFromEmail(string email)
        {
            var atIndex = email.IndexOf('@');
            return atIndex > 0 ? email[..atIndex] : email;
        }

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

        private static string? PickPrimaryRole(System.Collections.Generic.IList<string> roles)
        {
            if (roles is null || roles.Count == 0) return null;

            // Prioridad (ajusta si quieres)
            string[] priority = { "Admin", "Recepcion", "Facturacion", "Paciente" };
            foreach (var p in priority)
            {
                var hit = roles.FirstOrDefault(r => string.Equals(r, p, StringComparison.OrdinalIgnoreCase));
                if (hit != null) return hit;
            }

            return roles[0];
        }

        private static bool IsValidDocumentId(string? documentId)
        {
            if (string.IsNullOrWhiteSpace(documentId)) return false;
            return documentId.All(char.IsDigit) && documentId.Length == 11;
        }

        // ===========================
        // REGISTRO
        // ===========================
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var email = dto.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest("El correo electrónico es obligatorio.");
            }

            var documentId = dto.DocumentId?.Trim();
            if (!IsValidDocumentId(documentId))
            {
                return BadRequest("La cédula/ID debe contener exactamente 11 dígitos.");
            }

            var derivedUserName = DeriveUserNameFromEmail(email);
            if (string.IsNullOrWhiteSpace(derivedUserName))
            {
                return BadRequest("No se pudo generar un nombre de usuario a partir del correo.");
            }

            var existingUser = await _userManager.FindByNameAsync(derivedUserName);
            if (existingUser is not null)
            {
                return BadRequest($"Ya existe un usuario con el nombre {derivedUserName}.");
            }

            var user = new IdentityUser
            {
                UserName = derivedUserName,
                Email = email
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            var patient = new Patient
            {
                FullName = dto.FullName,
                DocumentId = documentId!,
                BirthDate = dto.BirthDate,
                Email = email,
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

            var claimResult = await _userManager.AddClaimAsync(
                user,
                new Claim(AppClaims.PatientId, patient.Id.ToString())
            );

            if (!claimResult.Succeeded)
            {
                _db.Patients.Remove(patient);
                await _db.SaveChangesAsync();
                await _userManager.DeleteAsync(user);
                return StatusCode(StatusCodes.Status500InternalServerError, claimResult.Errors);
            }

            await _userManager.AddToRoleAsync(user, "Paciente");

            var token = await _jwt.CreateAsync(user, _userManager);
            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    name = patient.FullName ?? user.UserName,
                    userName = user.UserName,
                    roles = roles,
                    role = PickPrimaryRole(roles),
                    patientId = patient.Id
                }
            });
        }

        // ===========================
        // LOGIN (Username o Email)
        // ===========================
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            // dto.UserName ahora se interpreta como "identificador" (username o email)
            var identifier = dto.UserName?.Trim();
            if (string.IsNullOrWhiteSpace(identifier))
                return Unauthorized();

            // 1) Intenta por username
            var user = await _userManager.FindByNameAsync(identifier);

            // 2) Si no existe, intenta por email
            if (user is null)
            {
                user = await _userManager.FindByEmailAsync(identifier);
            }

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

            var patient = await _db.Patients
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.Id);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    name = patient?.FullName ?? user.UserName,
                    userName = user.UserName,
                    roles = roles,                 // ✅ roles reales
                    role = PickPrimaryRole(roles), // ✅ rol principal (según prioridad)
                    patientId
                }
            });
        }
    }
}
