namespace Labotec.Api.Common;

public static class LabOrderStatuses
{
    public const string Created = "Created";
    public const string Completed = "Completed";
    public const string Canceled = "Canceled";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Created, Completed, Canceled
    };

    public static bool CanTransition(string from, string to)
    {
        from = (from ?? "").Trim();
        to = (to ?? "").Trim();

        if (!All.Contains(from) || !All.Contains(to)) return false;
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;

        return from switch
        {
            Created => to is Completed or Canceled,
            Completed => false,
            Canceled => false,
            _ => false
        };
    }
}
