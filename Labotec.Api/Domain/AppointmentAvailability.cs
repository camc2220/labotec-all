
namespace Labotec.Api.Domain;

public class AppointmentAvailability
{
    public System.Guid Id { get; set; } = System.Guid.NewGuid();

    // "YYYY-MM-DD" (local)
    public string Day { get; set; } = default!;

    // "HH:00" (local)
    public string Time { get; set; } = default!;

    // Inicio real del bucket horario (UTC) => clave para validar cupos
    public System.DateTime StartUtc { get; set; }

    // Cupos para esa hora (0 = bloqueado)
    public int Slots { get; set; }

    public System.DateTime UpdatedAtUtc { get; set; } = System.DateTime.UtcNow;
}
