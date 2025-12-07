namespace Labotec.Api.Domain;

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = default!;
    public string Number { get; set; } = default!;
    public decimal Amount { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public bool Paid { get; set; } = false;

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}