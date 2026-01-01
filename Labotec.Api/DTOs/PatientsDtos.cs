using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record PatientCreateDto(
    [param: Required, StringLength(160, MinimumLength = 3)] string FullName,
    [param: Required, StringLength(30, MinimumLength = 3)] string DocumentId,
    DateTime? BirthDate,
    [param: StringLength(120)] string? Email,
    [param: StringLength(30)] string? Phone,
    [param: StringLength(120)] string? UserName,
    [param: StringLength(100)] string? Password);

public record PatientReadDto(
    Guid Id,
    string FullName,
    string DocumentId,
    DateTime? BirthDate,
    string? Email,
    string? Phone,
    string? UserId);

public record PatientUpdateDto(
    [param: Required, StringLength(160, MinimumLength = 3)] string FullName,
    DateTime? BirthDate,
    [param: StringLength(120)] string? Email,
    [param: StringLength(30)] string? Phone);
