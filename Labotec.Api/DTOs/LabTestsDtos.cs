namespace Labotec.Api.DTOs;

public record LabTestCreateDto(
    string Code,
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice);

public record LabTestReadDto(
    Guid Id,
    string Code,
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    bool Active);

public record LabTestUpdateDto(
    string Name,
    string? DefaultUnit,
    decimal? DefaultPrice,
    bool Active);
