namespace Labotec.Api.Common;

public static class LabOrderItemStatuses
{
    public const string Pending = "Pending";
    public const string Resulted = "Resulted";
    public const string Canceled = "Canceled";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Pending, Resulted, Canceled
    };

    public static bool CanTransition(string from, string to)
    {
        from = (from ?? "").Trim();
        to = (to ?? "").Trim();

        if (!All.Contains(from) || !All.Contains(to)) return false;
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;

        return from switch
        {
            Pending => to is Resulted or Canceled,
            Resulted => false,
            Canceled => false,
            _ => false
        };
    }
}
