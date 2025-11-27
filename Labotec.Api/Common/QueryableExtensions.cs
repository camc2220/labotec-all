using System.Linq.Expressions;

namespace Labotec.Api.Common;

public static class QueryableExtensions
{
    public static IQueryable<T> ApplyOrdering<T>(this IQueryable<T> source, string? sortBy, string? sortDir)
    {
        if (string.IsNullOrWhiteSpace(sortBy)) return source;

        var parameter = Expression.Parameter(typeof(T), "x");
        var property = Expression.PropertyOrField(parameter, sortBy);
        var lambda = Expression.Lambda(property, parameter);

        var methodName = (sortDir ?? "asc").Equals("desc", StringComparison.OrdinalIgnoreCase)
            ? "OrderByDescending"
            : "OrderBy";

        var call = Expression.Call(
            typeof(Queryable),
            methodName,
            new[] { typeof(T), property.Type },
            source.Expression,
            Expression.Quote(lambda));

        return source.Provider.CreateQuery<T>(call);
    }

    public static IQueryable<T> ApplyPaging<T>(this IQueryable<T> source, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        return source.Skip((page - 1) * pageSize).Take(pageSize);
    }
}
