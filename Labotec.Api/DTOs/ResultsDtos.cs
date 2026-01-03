using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record LabResultCreateDto(
    [param: Required] Guid PatientId,
    [param: Required, StringLength(160, MinimumLength = 2)] string TestName,
    [param: Required, StringLength(120, MinimumLength = 1)] string ResultValue,
    [param: Required, StringLength(40, MinimumLength = 1)] string Unit,
    DateTime? ReleasedAt,
    [param: StringLength(300)] string? PdfUrl);

public record LabResultReadDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string TestName,
    string ResultValue,
    string Unit,
    string CreatedByName,
    DateTime ReleasedAt,
    string? PdfUrl);

public record LabResultUpdateDto(
    [param: Required, StringLength(160, MinimumLength = 2)] string TestName,
    [param: Required, StringLength(120, MinimumLength = 1)] string ResultValue,
    [param: Required, StringLength(40, MinimumLength = 1)] string Unit,
    DateTime ReleasedAt,
    [param: StringLength(300)] string? PdfUrl);
