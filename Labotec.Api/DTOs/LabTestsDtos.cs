using System;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record LabTestCreateDto(
    [param: Required, StringLength(30, MinimumLength = 1)] string Code,
    [param: Required, StringLength(160, MinimumLength = 2)] string Name,
    [param: StringLength(40)] string? DefaultUnit,
    [param: Range(typeof(decimal), "0", "9999999999999999")] decimal? DefaultPrice,
    [param: StringLength(160)] string? ReferenceValue);

public record LabTestReadDto(
    Guid Id,
    string Code,
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    string? ReferenceValue,
    bool Active);

public record LabTestUpdateDto(
    [param: Required, StringLength(160, MinimumLength = 2)] string Name,
    [param: StringLength(40)] string? DefaultUnit,
    [param: Range(typeof(decimal), "0", "9999999999999999")] decimal? DefaultPrice,
    [param: StringLength(160)] string? ReferenceValue,
    bool Active);

public record LabTestPublicDto(
    Guid Id,
    string Code,
    string Name,
    string? DefaultUnit);
