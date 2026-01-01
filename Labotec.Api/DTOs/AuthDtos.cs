using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs
{
    public record RegisterDto(
        [param: Required, StringLength(60, MinimumLength = 3)] string UserName,
        [param: Required, EmailAddress, StringLength(120)] string Email,
        [param: Required, StringLength(100, MinimumLength = 6)] string Password,
        [param: Required, StringLength(160, MinimumLength = 3)] string FullName,
        [param: Required, StringLength(30, MinimumLength = 3)] string DocumentId,
        DateTime? BirthDate,
        [param: StringLength(30)] string? Phone);

    public record LoginDto(
        [param: Required, StringLength(120, MinimumLength = 3)] string UserName,
        [param: Required, StringLength(100, MinimumLength = 1)] string Password);
}
