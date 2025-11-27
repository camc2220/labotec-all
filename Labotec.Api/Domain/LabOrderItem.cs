namespace Labotec.Api.Domain;

public class LabOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LabOrderId { get; set; }
    public LabOrder LabOrder { get; set; } = default!;

    public Guid LabTestId { get; set; }
    public LabTest LabTest { get; set; } = default!;

    /// <summary>
    /// Estado del ítem (Pending, Resulted, Canceled).
    /// </summary>
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Precio aplicado en esta orden (puede copiar DefaultPrice).
    /// </summary>
    public decimal? Price { get; set; }
}
