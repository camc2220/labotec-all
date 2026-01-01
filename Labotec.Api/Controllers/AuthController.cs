using Labotec.Api.Auth;
using Labotec.Api.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Labotec.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _um;
    private readonly SignInManager<IdentityUser> _sm;
    private readonly JwtTokenService _jwt;

    public AuthController(UserManager<IdentityUser> um, SignInManager<IdentityUser> sm, JwtTokenService jwt)
        => (_um, _sm, _jwt) = (um, sm, jwt);

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new IdentityUser { UserName = dto.UserName, Email = dto.Email };
        var result = await _um.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);
        await _um.AddToRoleAsync(user, "Admin");
        var token = await _jwt.CreateAsync(user, _um);
        return Ok(new { token });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _um.FindByNameAsync(dto.UserName);
        if (user is null) return Unauthorized();
        var pass = await _sm.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!pass.Succeeded) return Unauthorized();
        var token = await _jwt.CreateAsync(user, _um);
        return Ok(new { token });
    }
}
