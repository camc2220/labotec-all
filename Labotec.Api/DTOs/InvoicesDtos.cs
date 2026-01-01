namespace Labotec.Api.DTOs;

public record InvoiceCreateDto(Guid PatientId, string Number, decimal Amount, DateTime? IssuedAt, bool Paid);
public record InvoiceReadDto(Guid Id, Guid PatientId, string PatientName, string Number, decimal Amount, DateTime IssuedAt, bool Paid);
public record InvoiceUpdateDto(string Number, decimal Amount, DateTime IssuedAt, bool Paid);
