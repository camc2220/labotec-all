namespace Labotec.Api.DTOs;

public record LabOrderItemReadDto(
    Guid Id,
    Guid LabTestId,
    string TestCode,
    string TestName,
    string Status,
    decimal? Price);

public record LabOrderCreateDto(
    Guid PatientId,
    IEnumerable<Guid> TestIds,
    string? Notes);

public record LabOrderReadDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    DateTime CreatedAt,
    string Status,
    string? Notes,
    IReadOnlyCollection<LabOrderItemReadDto> Items);

public record LabOrderStatusUpdateDto(
    string Status);

public record LabOrderItemStatusUpdateDto(
    string Status);
