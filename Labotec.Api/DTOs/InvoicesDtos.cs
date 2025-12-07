namespace Labotec.Api.DTOs;

public record InvoiceItemCreateDto(Guid LabTestId, decimal? Price);
public record InvoiceItemReadDto(Guid LabTestId, string Code, string Name, decimal Price);

public record InvoiceCreateDto(
    Guid PatientId,
    string Number,
    IEnumerable<InvoiceItemCreateDto> Items,
    DateTime? IssuedAt,
    bool Paid);

public record InvoiceReadDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string Number,
    decimal Amount,
    DateTime IssuedAt,
    bool Paid,
    IEnumerable<InvoiceItemReadDto> Items);

public record InvoiceUpdateDto(
    string Number,
    IEnumerable<InvoiceItemCreateDto> Items,
    DateTime? IssuedAt,
    bool Paid);
