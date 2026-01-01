namespace Labotec.Api.Storage;
public class FileStorageService : IStorageService
{
    private readonly string _basePath;
    private readonly string _publicBase;
    public FileStorageService(IConfiguration cfg, IWebHostEnvironment env)
    {
        var www = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        _basePath = cfg.GetValue<string>("Storage:File:BasePath") ?? Path.Combine(www, "uploads");
        _publicBase = cfg.GetValue<string>("Storage:File:PublicBaseUrl") ?? "";
        Directory.CreateDirectory(_basePath);
    }
    public async Task<string> UploadAsync(string fileName, Stream content, string contentType)
    {
        var rel = fileName.Replace("\\","/").TrimStart('/');
        var full = Path.Combine(_basePath, rel.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        using var fs = File.Create(full);
        await content.CopyToAsync(fs);
        return string.IsNullOrWhiteSpace(_publicBase) ? "/uploads/" + rel : $"{_publicBase.TrimEnd('/')}/uploads/{rel}";
    }
    public string GetAccessUrl(string fileName, TimeSpan ttl)
    {
        var rel = fileName.Replace("\\","/").TrimStart('/');
        return string.IsNullOrWhiteSpace(_publicBase) ? "/uploads/" + rel : $"{_publicBase.TrimEnd('/')}/uploads/{rel}";
    }
}
