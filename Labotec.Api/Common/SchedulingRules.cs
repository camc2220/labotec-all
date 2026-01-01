using System;

namespace Labotec.Api.Common;

public static class SchedulingRules
{
    // IANA solicitado: America/Santo_Domingo
    // En Windows puede variar → fallback seguro a UTC-4 fijo (RD no usa DST).
    private static readonly TimeZoneInfo Tz = ResolveSantoDomingoTz();

    private static TimeZoneInfo ResolveSantoDomingoTz()
    {
        string[] candidates =
        {
            "America/Santo_Domingo",       // IANA (Linux/macOS)
            "SA Western Standard Time",    // Windows (a veces)
            "Atlantic Standard Time"       // Windows (caribe/atlantic)
        };

        foreach (var id in candidates)
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch { /* ignore */ }
        }

        return TimeZoneInfo.CreateCustomTimeZone(
            id: "America/Santo_Domingo",
            baseUtcOffset: TimeSpan.FromHours(-4),
            displayName: "America/Santo_Domingo",
            standardDisplayName: "America/Santo_Domingo");
    }

    public static DateTime ToLocal(DateTime utc)
    {
        var u = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(u, Tz);
    }

    /// <summary>
    /// Interpreta cualquier DateTime NO-Utc como "hora local de Santo Domingo" y lo convierte a UTC.
    /// Además normaliza a minuto exacto (segundos y ms = 0).
    /// </summary>
    public static DateTime NormalizeToUtc(DateTime input)
    {
        DateTime utc;

        if (input.Kind == DateTimeKind.Utc)
        {
            utc = input;
        }
        else
        {
            var local = DateTime.SpecifyKind(input, DateTimeKind.Unspecified);
            utc = TimeZoneInfo.ConvertTimeToUtc(local, Tz);
        }

        utc = new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, utc.Minute, 0, DateTimeKind.Utc);
        return utc;
    }

    /// <summary>
    /// Reglas de horario laboral en RD + bloqueo hora 12 completa.
    /// </summary>
    public static bool TryValidateBusinessHours(DateTime scheduledAtUtc, out string error)
    {
        error = string.Empty;

        if (scheduledAtUtc == default || scheduledAtUtc.Year < 1900)
        {
            error = "ScheduledAt inválido.";
            return false;
        }

        var local = ToLocal(scheduledAtUtc);

        if (local.DayOfWeek == DayOfWeek.Sunday)
        {
            error = "No se permiten citas los domingos.";
            return false;
        }

        // Bloqueo 12 PM completo
        if (local.Hour == 12)
        {
            error = "No se permiten citas en la hora 12:00 PM (12:00–12:59).";
            return false;
        }

        var time = local.TimeOfDay;
        var start = new TimeSpan(8, 0, 0);

        if (local.DayOfWeek == DayOfWeek.Saturday)
        {
            var endSat = new TimeSpan(12, 0, 0); // < 12:00
            if (time < start || time >= endSat)
            {
                error = "Horario inválido. Sábado: 8:00 AM a 12:00 PM (no incluye 12:00).";
                return false;
            }

            return true;
        }

        var endWeek = new TimeSpan(17, 0, 0); // < 17:00
        if (time < start || time >= endWeek)
        {
            error = "Horario inválido. Lunes a Viernes: 8:00 AM a 5:00 PM (no incluye 5:00).";
            return false;
        }

        return true;
    }

    /// <summary>
    /// No permitir crear/reprogramar en el pasado (comparación real en UTC).
    /// </summary>
    public static bool TryValidateNotPast(DateTime scheduledAtUtc, DateTime utcNow, out string error)
    {
        error = string.Empty;

        if (scheduledAtUtc < utcNow)
        {
            error = "No se permiten citas en el pasado.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Retorna el rango UTC [start,end) correspondiente a la hora local (HH:00–HH:59) en RD.
    /// </summary>
    public static (DateTime startUtc, DateTime endUtc) GetLocalHourBucketUtcRange(DateTime scheduledAtUtc)
    {
        var local = ToLocal(scheduledAtUtc);

        var bucketLocalStart = new DateTime(local.Year, local.Month, local.Day, local.Hour, 0, 0, DateTimeKind.Unspecified);
        var bucketLocalEnd = bucketLocalStart.AddHours(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(bucketLocalStart, Tz);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(bucketLocalEnd, Tz);

        startUtc = new DateTime(startUtc.Year, startUtc.Month, startUtc.Day, startUtc.Hour, startUtc.Minute, 0, DateTimeKind.Utc);
        endUtc = new DateTime(endUtc.Year, endUtc.Month, endUtc.Day, endUtc.Hour, endUtc.Minute, 0, DateTimeKind.Utc);

        return (startUtc, endUtc);
    }
}
