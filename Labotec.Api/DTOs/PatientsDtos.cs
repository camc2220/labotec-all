namespace Labotec.Api.DTOs;

public record PatientCreateDto(string FullName, string DocumentId, DateTime? BirthDate, string? Email, string? Phone);
public record PatientReadDto(Guid Id, string FullName, string DocumentId, DateTime? BirthDate, string? Email, string? Phone);
public record PatientUpdateDto(string FullName, DateTime? BirthDate, string? Email, string? Phone);
