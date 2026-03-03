using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Machines;

public class CreateMachineRequest
{
    [Required] public string Address { get; set; } = string.Empty;
    [Required] public double Latitude { get; set; }
    [Required] public double Longitude { get; set; }
    public string Status { get; set; } = "working";
    [Required] public string WorkingHours { get; set; } = string.Empty;
    [Required] public string Phone { get; set; } = string.Empty;
    public string[] PaymentMethods { get; set; } = Array.Empty<string>();
    [Required] public string WaterPrice { get; set; } = string.Empty;
    public DateTime LastMaintenance { get; set; } = DateTime.UtcNow;
}

public class UpdateMachineRequest : CreateMachineRequest { }

public class MachineDto
{
    public Guid Id { get; set; }
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string WorkingHours { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string[] PaymentMethods { get; set; } = Array.Empty<string>();
    public string WaterPrice { get; set; } = string.Empty;
    public DateTime LastMaintenance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public double? Distance { get; set; }
}
