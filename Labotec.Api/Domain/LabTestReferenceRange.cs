namespace Labotec.Api.Domain;

public class LabTestReferenceRange
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LabTestId { get; set; }
    public LabTest LabTest { get; set; } = default!;

    // "M", "F" o null (cualquiera)
    public string? Sex { get; set; }

    public int? AgeMinYears { get; set; }
    public int? AgeMaxYears { get; set; }

    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }

    // Para rangos tipo "Negativo", "No reactivo", etc.
    public string? TextRange { get; set; }

    public string? Unit { get; set; }
    public string? Notes { get; set; }

    public bool Active { get; set; } = true;
}
