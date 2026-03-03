namespace WaterFix.API.Models;

public class Complaint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MachineId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserPhone { get; set; }
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string Status { get; set; } = "new";
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Machine Machine { get; set; } = null!;
    public User? User { get; set; }
}
