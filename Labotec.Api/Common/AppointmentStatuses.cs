namespace Labotec.Api.Common;

public static class AppointmentStatuses
{
    public const string Scheduled = "Scheduled";
    public const string CheckedIn = "CheckedIn";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string NoShow = "NoShow";
    public const string Canceled = "Canceled";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Scheduled, CheckedIn, InProgress, Completed, NoShow, Canceled
    };

    // Estados que BLOQUEAN cupo horario
    public static readonly HashSet<string> Blocking = new(StringComparer.OrdinalIgnoreCase)
    {
        Scheduled, CheckedIn, InProgress
    };

    // Para queries EF traducibles
    public static readonly string[] BlockingForQuery = { Scheduled, CheckedIn, InProgress };

    public static bool IsBlocking(string? status)
        => Blocking.Contains((status ?? string.Empty).Trim());

    public static bool CanTransition(string from, string to)
    {
        from = (from ?? "").Trim();
        to = (to ?? "").Trim();

        if (!All.Contains(from) || !All.Contains(to)) return false;
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;

        return from switch
        {
            Scheduled => to is CheckedIn or Canceled or NoShow,
            CheckedIn => to is InProgress or Canceled or NoShow,
            InProgress => to is Completed or Canceled,
            Completed => false,
            NoShow => false,
            Canceled => false,
            _ => false
        };
    }
}
