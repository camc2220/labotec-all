using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Labotec.Api.Data;
using Labotec.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Common;

public static class AppointmentAvailabilityHelper
{
    private static readonly int[] WeekdayHours = { 8, 9, 10, 11, 13, 14, 15, 16 };
    private static readonly int[] SaturdayHours = { 8, 9, 10, 11 };

    public static async Task<int> GetDefaultCapacityAsync(AppDbContext db)
    {
        var max = await db.SchedulingSettings.AsNoTracking()
            .Where(x => x.Id == 1)
            .Select(x => x.MaxPatientsPerHour)
            .FirstOrDefaultAsync();

        return max > 0 ? max : 10;
    }

    public static (string Day, string Time) ToLocalStrings(DateTime bucketStartUtc)
    {
        var local = SchedulingRules.ToLocal(bucketStartUtc);
        return (local.ToString("yyyy-MM-dd"), local.ToString("HH:00"));
    }

    public static IEnumerable<DateTime> BuildWorkingHourBuckets(DateTime startLocalDate, int days)
    {
        if (days <= 0) yield break;

        for (var i = 0; i < days; i++)
        {
            var day = startLocalDate.Date.AddDays(i);
            var hours = day.DayOfWeek switch
            {
                DayOfWeek.Sunday => Array.Empty<int>(),
                DayOfWeek.Saturday => SaturdayHours,
                _ => WeekdayHours
            };

            foreach (var hour in hours)
            {
                var localStart = new DateTime(day.Year, day.Month, day.Day, hour, 0, 0, DateTimeKind.Unspecified);
                var normalized = SchedulingRules.NormalizeToUtc(localStart);
                var (bucketStartUtc, _) = SchedulingRules.GetLocalHourBucketUtcRange(normalized);
                yield return bucketStartUtc;
            }
        }
    }

    public static async Task EnsureGenericAvailabilityAsync(
        AppDbContext db,
        DateTime bucketStartUtc,
        int defaultCapacity,
        bool saveChanges = false)
    {
        if (db.AppointmentAvailabilities.Local.Any(x => x.StartUtc == bucketStartUtc))
            return;

        if (await db.AppointmentAvailabilities.AsNoTracking().AnyAsync(x => x.StartUtc == bucketStartUtc))
            return;

        var (day, time) = ToLocalStrings(bucketStartUtc);

        db.AppointmentAvailabilities.Add(new AppointmentAvailability
        {
            Day = day,
            Time = time,
            StartUtc = bucketStartUtc,
            Slots = defaultCapacity,
            UpdatedAtUtc = DateTime.UtcNow
        });

        if (saveChanges)
            await db.SaveChangesAsync();
    }

    public static async Task<Dictionary<DateTime, int>> CountBookedByBucketAsync(
        AppDbContext db,
        DateTime startInclusive,
        DateTime endExclusive)
    {
        return await db.Appointments.AsNoTracking()
            .Where(a => a.ScheduledAt >= startInclusive && a.ScheduledAt < endExclusive)
            .Where(a => AppointmentStatuses.BlockingForQuery.Contains(a.Status))
            .GroupBy(a => new { a.ScheduledAt.Year, a.ScheduledAt.Month, a.ScheduledAt.Day, a.ScheduledAt.Hour })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Day, g.Key.Hour, Count = g.Count() })
            .ToDictionaryAsync(
                x => new DateTime(x.Year, x.Month, x.Day, x.Hour, 0, 0, DateTimeKind.Utc),
                x => x.Count);
    }
}
