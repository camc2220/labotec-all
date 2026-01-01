namespace Labotec.Api.Common;

public class Query
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public string SortDir { get; set; } = "asc";
}

public record PagedResult<T>(IEnumerable<T> Items, int Page, int PageSize, int TotalCount);
