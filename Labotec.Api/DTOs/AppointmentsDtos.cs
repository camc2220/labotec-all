using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record AppointmentCreateDto(
    [param: Required] Guid PatientId,
    [param: Required] DateTime ScheduledAt,
    [param: Required, StringLength(120, MinimumLength = 2)] string Type,
    [param: StringLength(500)] string? Notes
);

public record AppointmentReadDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    DateTime ScheduledAt,
    string Type,
    string Status,
    string? Notes
);

public record AppointmentUpdateDto(
    [param: Required] DateTime ScheduledAt,
    [param: Required, StringLength(120, MinimumLength = 2)] string Type,
    [param: Required, StringLength(30)] string Status,
    [param: StringLength(500)] string? Notes
);
