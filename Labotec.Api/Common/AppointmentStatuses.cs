using System;
using System.Collections.Generic;

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

    // Para queries EF traducibles (NO lo cambies a HashSet aquí)
    public static readonly string[] BlockingForQuery = { Scheduled, CheckedIn, InProgress };

    public static bool IsBlocking(string? status)
        => Blocking.Contains((status ?? string.Empty).Trim());

    public static string Normalize(string? status)
    {
        var s = (status ?? string.Empty).Trim();

        if (s.Equals(Scheduled, StringComparison.OrdinalIgnoreCase)) return Scheduled;
        if (s.Equals(CheckedIn, StringComparison.OrdinalIgnoreCase)) return CheckedIn;
        if (s.Equals(InProgress, StringComparison.OrdinalIgnoreCase)) return InProgress;
        if (s.Equals(Completed, StringComparison.OrdinalIgnoreCase)) return Completed;
        if (s.Equals(NoShow, StringComparison.OrdinalIgnoreCase)) return NoShow;
        if (s.Equals(Canceled, StringComparison.OrdinalIgnoreCase)) return Canceled;

        return s;
    }

    public static int GetProgressPercent(string? status)
    {
        var s = Normalize(status);

        return s switch
        {
            Scheduled => 0,
            CheckedIn => 33,
            InProgress => 66,
            Completed => 100,
            NoShow => 100,
            Canceled => 100,
            _ => 0
        };
    }

    public static bool CanTransition(string from, string to)
    {
        from = Normalize(from);
        to = Normalize(to);

        if (!All.Contains(from) || !All.Contains(to)) return false;
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;

        return from switch
        {
            // Staff puede cambiar directamente a un estado posterior desde la tabla.
            Scheduled => to is CheckedIn or InProgress or Completed or Canceled or NoShow,
            CheckedIn => to is InProgress or Completed or Canceled or NoShow,
            InProgress => to is Completed or Canceled,
            Completed => false,
            NoShow => false,
            Canceled => false,
            _ => false
        };
    }

    // ✅ NUEVO: rollback controlado
    public static bool CanRevert(string from, string to)
    {
        from = Normalize(from);
        to = Normalize(to);

        if (!All.Contains(from) || !All.Contains(to)) return false;
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;

        return (from, to) switch
        {
            (CheckedIn, Scheduled) => true,
            (InProgress, CheckedIn) => true,
            (Completed, InProgress) => true,
            _ => false
        };
    }
}
