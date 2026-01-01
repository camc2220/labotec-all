using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record AppointmentMeCreateDto(
    [param: Required] DateTime ScheduledAt,
    [param: Required, StringLength(120, MinimumLength = 2)] string Type,
    [param: StringLength(500)] string? Notes
);

public record AppointmentMeUpdateDto(
    [param: Required] DateTime ScheduledAt,
    [param: Required, StringLength(120, MinimumLength = 2)] string Type,
    [param: StringLength(500)] string? Notes
);
