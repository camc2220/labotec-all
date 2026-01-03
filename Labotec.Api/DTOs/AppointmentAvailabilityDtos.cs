
namespace Labotec.Api.DTOs;

public record AppointmentAvailabilityDto(
    System.Guid? Id,
    string Day,
    string Time,
    int Slots,
    int AvailableSlots,
    bool IsCustom
);

public record AppointmentAvailabilityUpsertDto(
    string Day,
    string Time,
    int Slots
);
