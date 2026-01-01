namespace Labotec.Api.Domain;

public class LabOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = default!;

    /// <summary>
    /// Fecha y hora de creación de la orden.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Estado general de la orden (Created, Completed, Canceled).
    /// </summary>
    public string Status { get; set; } = "Created";

    /// <summary>
    /// Observaciones generales de la orden (opcional).
    /// </summary>
    public string? Notes { get; set; }

    public ICollection<LabOrderItem> Items { get; set; } = new List<LabOrderItem>();
}
