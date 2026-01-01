using Labotec.Api.Domain;

namespace Labotec.Api.Common;

public static class InvoiceQueryableExtensions
{
    public static IQueryable<Invoice> ApplyInvoiceOrdering(
        this IQueryable<Invoice> source,
        string? sortBy,
        string? sortDir)
    {
        var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);

        return (sortBy?.Trim().ToLowerInvariant()) switch
        {
            "number" => descending
                ? source.OrderByDescending(i => i.Number)
                : source.OrderBy(i => i.Number),
            "amount" => descending
                ? source.OrderByDescending(i => i.Amount)
                : source.OrderBy(i => i.Amount),
            "paid" => descending
                ? source.OrderByDescending(i => i.Paid)
                : source.OrderBy(i => i.Paid),
            "patientid" => descending
                ? source.OrderByDescending(i => i.PatientId)
                : source.OrderBy(i => i.PatientId),
            "patientname" => descending
                ? source.OrderByDescending(i => i.Patient != null ? i.Patient.FullName : string.Empty)
                : source.OrderBy(i => i.Patient != null ? i.Patient.FullName : string.Empty),
            _ => descending
                ? source.OrderByDescending(i => i.IssuedAt)
                : source.OrderBy(i => i.IssuedAt)
        };
    }
}
