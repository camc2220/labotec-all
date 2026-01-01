using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record LabOrderItemReadDto(
    Guid Id,
    Guid LabTestId,
    string TestCode,
    string TestName,
    string Status,
    decimal? Price);

public record LabOrderCreateDto(
    [param: Required] Guid PatientId,
    [param: Required] IEnumerable<Guid> TestIds,
    [param: StringLength(500)] string? Notes);

public record LabOrderReadDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    DateTime CreatedAt,
    string Status,
    string? Notes,
    IReadOnlyCollection<LabOrderItemReadDto> Items);

public record LabOrderStatusUpdateDto(
    [param: Required, StringLength(30, MinimumLength = 2)] string Status);

public record LabOrderItemStatusUpdateDto(
    [param: Required, StringLength(30, MinimumLength = 2)] string Status);
