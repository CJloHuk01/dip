using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Admin;

public class AdminMachineDto
{
    public Guid Id { get; set; }
    public string? PublicCode { get; set; }
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
}

public class CreateMachineRequest
{
    [Required(ErrorMessage = "Укажите адрес")]
    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    [Range(-90, 90, ErrorMessage = "Некорректная широта")]
    public double Latitude { get; set; }

    [Range(-180, 180, ErrorMessage = "Некорректная долгота")]
    public double Longitude { get; set; }

    public string Status { get; set; } = "working";

    [Required(ErrorMessage = "Укажите часы работы")]
    [MaxLength(100)]
    public string WorkingHours { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите телефон")]
    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    public string[] PaymentMethods { get; set; } = Array.Empty<string>();

    [Required(ErrorMessage = "Укажите цену")]
    [MaxLength(50)]
    public string WaterPrice { get; set; } = string.Empty;

    public DateTime LastMaintenance { get; set; } = DateTime.UtcNow;
}

public class UpdateMachineRequest : CreateMachineRequest
{
}
