namespace WaterFix.API.Helpers;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationDays { get; set; } = 7;
    public int AdminSessionHours { get; set; } = 12;
}

public class FileSettings
{
    public string UploadPath { get; set; } = "uploads";
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024; // фото водомата
    public long MaxPhotoSizeBytes { get; set; } = 10 * 1024 * 1024;
    public long MaxVideoSizeBytes { get; set; } = 50 * 1024 * 1024;
    public int MaxPhotosPerComplaint { get; set; } = 5;
}
