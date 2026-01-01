using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record SchedulingSettingsReadDto(
    int MaxPatientsPerHour,
    DateTime UpdatedAt,
    string? UpdatedByUserId);

public record SchedulingSettingsUpdateDto(
    [param: Range(1, 200)] int MaxPatientsPerHour);
