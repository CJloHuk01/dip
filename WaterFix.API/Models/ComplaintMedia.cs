namespace WaterFix.API.Models;

public class ComplaintMedia
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ComplaintId { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string MediaType { get; set; } = "photo";
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Complaint Complaint { get; set; } = null!;
}
