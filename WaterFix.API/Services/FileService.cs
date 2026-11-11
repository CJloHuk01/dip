using WaterFix.API.Helpers;
using WaterFix.API.Models;

namespace WaterFix.API.Services;

public class FileService
{
    private static readonly string[] ImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] VideoExtensions = { ".mp4", ".webm", ".mov" };

    private readonly FileSettings _settings;
    private readonly IWebHostEnvironment _env;

    public FileService(FileSettings settings, IWebHostEnvironment env)
    {
        _settings = settings;
        _env = env;
    }

    // Публичные фото водоматов (wwwroot/uploads/machines)
    public async Task<string> SaveFileAsync(IFormFile file, string subfolder)
    {
        if (file.Length > _settings.MaxFileSizeBytes)
            throw new Exception($"Файл превышает максимальный размер {_settings.MaxFileSizeBytes / 1024 / 1024} МБ");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!ImageExtensions.Contains(ext))
            throw new Exception("Разрешены только изображения: jpg, jpeg, png, webp");

        var uploadPath = Path.Combine(_env.WebRootPath ?? "wwwroot", _settings.UploadPath, subfolder);
        Directory.CreateDirectory(uploadPath);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/{_settings.UploadPath}/{subfolder}/{fileName}";
    }

    public void DeleteFile(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        var path = Path.Combine(_env.WebRootPath ?? "wwwroot", url.TrimStart('/'));
        if (File.Exists(path)) File.Delete(path);
    }

    // Приватные медиа заявок (App_Data/complaints/{id})
    public async Task<ComplaintMedia> SaveComplaintMediaAsync(
        Guid complaintId, IFormFile file, string mediaType, int sortOrder)
    {
        var isVideo = mediaType == "video";
        var allowed = isVideo ? VideoExtensions : ImageExtensions;
        var maxSize = isVideo ? _settings.MaxVideoSizeBytes : _settings.MaxPhotoSizeBytes;
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowed.Contains(ext))
            throw new Exception(isVideo
                ? "Разрешены видео: mp4, webm, mov"
                : "Разрешены изображения: jpg, jpeg, png, webp");

        if (file.Length <= 0)
            throw new Exception("Файл пустой");

        if (file.Length > maxSize)
            throw new Exception($"Файл превышает максимальный размер {maxSize / 1024 / 1024} МБ");

        var folder = Path.Combine(_env.ContentRootPath, "App_Data", "complaints", complaintId.ToString("N"));
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(folder, fileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return new ComplaintMedia
        {
            ComplaintId = complaintId,
            RelativePath = $"complaints/{complaintId:N}/{fileName}",
            MediaType = mediaType,
            ContentType = ResolveContentType(ext),
            SizeBytes = file.Length,
            SortOrder = sortOrder
        };
    }

    public string GetMediaPhysicalPath(string relativePath)
    {
        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "App_Data"));
        var fullPath = Path.GetFullPath(Path.Combine(root, relativePath));

        if (!fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Некорректный путь к файлу");

        return fullPath;
    }

    public void DeleteComplaintMedia(string relativePath)
    {
        try
        {
            var path = GetMediaPhysicalPath(relativePath);
            if (File.Exists(path)) File.Delete(path);
        }
        catch (InvalidOperationException)
        {
            // Некорректный путь игнорируем — файл всё равно недоступен
        }
    }

    public void DeleteComplaintMediaFolder(Guid complaintId)
    {
        var folder = Path.Combine(_env.ContentRootPath, "App_Data", "complaints", complaintId.ToString("N"));
        if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);
    }

    private static string ResolveContentType(string ext) => ext switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".mp4" => "video/mp4",
        ".webm" => "video/webm",
        ".mov" => "video/quicktime",
        _ => "application/octet-stream"
    };
}
