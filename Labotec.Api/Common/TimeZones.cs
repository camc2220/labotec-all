using System;

namespace Labotec.Api.Common;

public static class TimeZones
{
    public static readonly TimeZoneInfo SantoDomingo = ResolveSantoDomingo();

    private static TimeZoneInfo ResolveSantoDomingo()
    {

        var ids = new[]
        {
            "America/Santo_Domingo",
            "SA Western Standard Time",
            "Atlantic Standard Time"
        };

        foreach (var id in ids)
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }

        // Fallback: RD es UTC-4 (sin DST)
        return TimeZoneInfo.CreateCustomTimeZone(
            "America/Santo_Domingo_Fallback",
            TimeSpan.FromHours(-4),
            "America/Santo_Domingo",
            "America/Santo_Domingo");
    }
}
