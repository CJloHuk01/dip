using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Admin;

public class AdminComplaintDto
{
    public Guid Id { get; set; }
    public Guid MachineId { get; set; }
    public string MachineAddress { get; set; } = string.Empty;
    public string? MachineCode { get; set; }
    public string? ReporterName { get; set; }
    public string ContactType { get; set; } = string.Empty;
    public string ContactValue { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AdminComment { get; set; }
    public DateTime? PrivacyAcceptedAt { get; set; }
    public string? PrivacyVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ComplaintMediaDto> Media { get; set; } = new();
}

public class ComplaintMediaDto
{
    public Guid Id { get; set; }
    public string MediaType { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class UpdateComplaintRequest
{
    [Required(ErrorMessage = "Укажите статус")]
    public string Status { get; set; } = string.Empty;

    [MaxLength(2000, ErrorMessage = "Комментарий слишком длинный")]
    public string? AdminComment { get; set; }
}
