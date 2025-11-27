using System.Linq;
using System.Text;

namespace Labotec.Api.Common;

public static class CsvBuilder
{
    public static string Build(IEnumerable<IEnumerable<string?>> rows)
    {
        var sb = new StringBuilder();
        foreach (var row in rows)
        {
            sb.Append(string.Join(',', row.Select(Escape)));
            sb.AppendLine();
        }
        return sb.ToString();
    }

    private static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;

        var sanitized = value.Replace("\"", "\"\"");
        return value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r')
            ? $"\"{sanitized}\""
            : sanitized;
    }
}
