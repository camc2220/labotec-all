namespace Labotec.Api.DTOs;
public record RegisterDto(string UserName, string Email, string Password);
public record LoginDto(string UserName, string Password);
