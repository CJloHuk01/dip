namespace WaterFix.API.Helpers;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationDays { get; set; } = 7;
}

public class FileSettings
{
    public string UploadPath { get; set; } = "uploads";
    public long MaxFileSizeBytes { get; set; } = 5 * 1024 * 1024; // 5MB
}
