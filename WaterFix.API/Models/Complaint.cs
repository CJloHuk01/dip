namespace WaterFix.API.Models;

public class Complaint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MachineId { get; set; }
    public string? ReporterName { get; set; }
    public string ContactType { get; set; } = "phone";
    public string ContactValue { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string Status { get; set; } = "new";
    public string? AdminComment { get; set; }
    public DateTime? PrivacyAcceptedAt { get; set; }
    public string? PrivacyVersion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Machine Machine { get; set; } = null!;
    public ICollection<ComplaintMedia> Media { get; set; } = new List<ComplaintMedia>();
}
