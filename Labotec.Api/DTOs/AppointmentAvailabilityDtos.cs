
namespace Labotec.Api.DTOs;

public record AppointmentAvailabilityDto(
    System.Guid Id,
    string Day,
    string Time,
    int Slots
);

public record AppointmentAvailabilityUpsertDto(
    string Day,
    string Time,
    int Slots
);
