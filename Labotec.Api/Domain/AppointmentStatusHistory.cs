using System;

namespace Labotec.Api.Domain;

public class AppointmentStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = default!;

    public string FromStatus { get; set; } = default!;
    public string ToStatus { get; set; } = default!;

    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
    public string? ChangedByUserId { get; set; }

    public string? Reason { get; set; }
}
