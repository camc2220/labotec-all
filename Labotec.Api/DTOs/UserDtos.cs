using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record UserReadDto(
    string Id,
    string? UserName,
    string? Email,
    IReadOnlyCollection<string> Roles,
    bool IsLocked,
    DateTimeOffset? LockoutEnd);

public record UserCreateDto(
    [param: Required, StringLength(120, MinimumLength = 3)] string UserName,
    [param: Required, EmailAddress, StringLength(120)] string Email,
    [param: Required, StringLength(100, MinimumLength = 6)] string Password,
    IReadOnlyCollection<string>? Roles);

public record UserUpdateDto(
    [param: StringLength(120, MinimumLength = 3)] string? UserName,
    [param: EmailAddress, StringLength(120)] string? Email,
    IReadOnlyCollection<string>? Roles,
    bool? Lockout);

public record UserChangePasswordDto(
    [param: Required, StringLength(100, MinimumLength = 1)] string CurrentPassword,
    [param: Required, StringLength(100, MinimumLength = 6)] string NewPassword);

public record UserAdminChangePasswordDto(
    [param: Required, StringLength(100, MinimumLength = 6)] string NewPassword);
