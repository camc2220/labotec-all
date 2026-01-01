namespace Labotec.Api.Domain;

public class AvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Inicio del bucket de 1 hora en UTC (calculado desde hora local RD)
    public DateTime StartUtc { get; set; }

    public int Capacity { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? UpdatedByUserId { get; set; }
}
