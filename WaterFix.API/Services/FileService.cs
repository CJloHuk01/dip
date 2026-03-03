using WaterFix.API.Helpers;

namespace WaterFix.API.Services;

public class FileService
{
    private readonly FileSettings _settings;
    private readonly IWebHostEnvironment _env;

    public FileService(FileSettings settings, IWebHostEnvironment env)
    {
        _settings = settings;
        _env = env;
    }

    public async Task<string> SaveFileAsync(IFormFile file, string subfolder)
    {
        if (file.Length > _settings.MaxFileSizeBytes)
            throw new Exception($"Файл превышает максимальный размер {_settings.MaxFileSizeBytes / 1024 / 1024}MB");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            throw new Exception("Разрешены только изображения: jpg, jpeg, png, webp");

        var uploadPath = Path.Combine(_env.WebRootPath ?? "wwwroot", _settings.UploadPath, subfolder);
        Directory.CreateDirectory(uploadPath);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/{_settings.UploadPath}/{subfolder}/{fileName}";
    }

    public void DeleteFile(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        var path = Path.Combine(_env.WebRootPath ?? "wwwroot", url.TrimStart('/'));
        if (File.Exists(path)) File.Delete(path);
    }
}
