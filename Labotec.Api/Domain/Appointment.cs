
namespace Labotec.Api.Domain;

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = default!;

    public DateTime ScheduledAt { get; set; }

    public string Type { get; set; } = "Laboratorio";

    public string? Notes { get; set; }

    // Estado controlado (Scheduled, CheckedIn, InProgress, Completed, NoShow, Canceled)
    public string Status { get; set; } = Common.AppointmentStatuses.Scheduled;

    // Auditoría del flujo (quién y cuándo)
    public DateTime? CheckedInAt { get; set; }
    public string? CheckedInByUserId { get; set; }

    public DateTime? StartedAt { get; set; }
    public string? StartedByUserId { get; set; }

    public DateTime? CompletedAt { get; set; }
    public string? CompletedByUserId { get; set; }

    public DateTime? CanceledAt { get; set; }
    public string? CanceledByUserId { get; set; }

    public DateTime? NoShowAt { get; set; }
    public string? NoShowByUserId { get; set; }
}
