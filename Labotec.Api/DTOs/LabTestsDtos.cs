namespace Labotec.Api.DTOs;

public record LabTestCreateDto(
    string Code,
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    string? ReferenceValue);

public record LabTestReadDto(
    Guid Id,
    string Code,
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    string? ReferenceValue,
    bool Active);

public record LabTestUpdateDto(
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    string? ReferenceValue,
    bool Active);

public record LabTestPublicDto(
    Guid Id,
    string Code,
    string Name,
    string? DefaultUnit,
    string? ReferenceValue);
