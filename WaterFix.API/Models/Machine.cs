namespace WaterFix.API.Models;

public class Machine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Status { get; set; } = "working";
    public string? PhotoUrl { get; set; }
    public string WorkingHours { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string[] PaymentMethods { get; set; } = Array.Empty<string>();
    public string WaterPrice { get; set; } = string.Empty;
    public DateTime LastMaintenance { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Complaint> Complaints { get; set; } = new List<Complaint>();
}
