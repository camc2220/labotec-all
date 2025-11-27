namespace Labotec.Api.Domain;

public class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = default!;
    public string DocumentId { get; set; } = default!;
    public DateTime? BirthDate { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? UserId { get; set; }

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<LabResult> Results { get; set; } = new List<LabResult>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}