namespace Labotec.Api.Domain;

public class InvoiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = default!;
    public Guid LabTestId { get; set; }
    public LabTest LabTest { get; set; } = default!;
    public decimal Price { get; set; }
}
