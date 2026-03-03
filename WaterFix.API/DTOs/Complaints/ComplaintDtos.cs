using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Complaints;

public class CreateComplaintRequest
{
    [Required] public Guid MachineId { get; set; }
    public string? UserName { get; set; }
    public string? UserPhone { get; set; }

    [Required] public string Type { get; set; } = string.Empty;
    [Required] public string TypeLabel { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
}

public class UpdateComplaintRequest
{
    [Required] public string Status { get; set; } = string.Empty;
    public string? AdminComment { get; set; }
}

public class ComplaintDto
{
    public Guid Id { get; set; }
    public Guid MachineId { get; set; }
    public string MachineAddress { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserPhone { get; set; }
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
