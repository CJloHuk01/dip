namespace WaterFix.API.Helpers;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string error) => new() { Success = false, Error = error };
}

public class PagedApiResponse<T>
{
    public bool Success { get; set; }
    public IEnumerable<T>? Data { get; set; }
    public string? Error { get; set; }
    public PaginationMeta? Pagination { get; set; }

    public static PagedApiResponse<T> Ok(IEnumerable<T> data, int page, int limit, int total) => new()
    {
        Success = true,
        Data = data,
        Pagination = new PaginationMeta
        {
            Page = page,
            Limit = limit,
            Total = total,
            Pages = (int)Math.Ceiling((double)total / limit)
        }
    };

    public static PagedApiResponse<T> Fail(string error) => new() { Success = false, Error = error };
}

public class PaginationMeta
{
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int Pages { get; set; }
}
