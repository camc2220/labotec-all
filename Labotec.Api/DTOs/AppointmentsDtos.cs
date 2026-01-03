using System;
using System.ComponentModel.DataAnnotations;
using Labotec.Api.Common;

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
)
{
    // ? No rompe tu código actual y tu frontend puede pintar la barra con esto si quiere.
    public int ProgressPercent => AppointmentStatuses.GetProgressPercent(Status);
}

public record AppointmentUpdateDto(
    [param: Required] DateTime ScheduledAt,
    [param: Required, StringLength(120, MinimumLength = 2)] string Type,
    [param: Required, StringLength(30)] string Status,
    [param: StringLength(500)] string? Notes
);

// ? NUEVO: body para /revert
public record AppointmentRevertDto(
    [param: Required, StringLength(30)] string ToStatus,
    [param: Required, MinLength(3), StringLength(500)] string Reason
);
