namespace Labotec.Api.Domain;

public class LabResult
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = default!;

    public string TestName { get; set; } = default!;
    public string ResultValue { get; set; } = default!;
    public string Unit { get; set; } = "";
    public string CreatedByName { get; set; } = "";

    public DateTime ReleasedAt { get; set; } = DateTime.UtcNow;
    public string? PdfUrl { get; set; }
}
