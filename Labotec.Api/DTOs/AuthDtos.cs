
namespace Labotec.Api.DTOs
{
    public record RegisterDto(
        string UserName,
        string Email,
        string Password,
        string FullName,
        string DocumentId,
        DateTime? BirthDate,
        string? Phone);
    public record LoginDto(string UserName, string Password);
}
