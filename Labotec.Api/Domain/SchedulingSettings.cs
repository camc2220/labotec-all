namespace Labotec.Api.Domain;

public class SchedulingSettings
{
    public int Id { get; set; } = 1;

    // Cupo por hora (default 10)
    public int MaxPatientsPerHour { get; set; } = 10;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
