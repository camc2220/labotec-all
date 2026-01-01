using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Labotec.Api.DTOs;

public record InvoiceItemCreateDto(
    [param: Required] Guid LabTestId,
    // se permite null; si viene con valor, se valida en backend contra DefaultPrice
    [param: Range(typeof(decimal), "0", "9999999999999999")] decimal? Price);

public record InvoiceItemReadDto(
    Guid LabTestId,
    string Code,
    string Name,
    decimal Price);

public record InvoiceCreateDto(
    [param: Required] Guid PatientId,
    [param: Required, StringLength(40, MinimumLength = 1)] string Number,
    [param: Required] IEnumerable<InvoiceItemCreateDto> Items,
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
    [param: Required, StringLength(40, MinimumLength = 1)] string Number,
    [param: Required] IEnumerable<InvoiceItemCreateDto> Items,
    DateTime? IssuedAt,
    bool Paid);
