using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Public;

public class PublicMachineDto
{
    public Guid Id { get; set; }
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string WorkingHours { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string WaterPrice { get; set; } = string.Empty;
}

public class CreatePublicComplaintRequest
{
    [Required(ErrorMessage = "Не указан водомат")]
    public string MachineCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Выберите проблему")]
    public string Type { get; set; } = string.Empty;

    [Required(ErrorMessage = "Выберите проблему")]
    public string TypeLabel { get; set; } = string.Empty;

    [MaxLength(2000, ErrorMessage = "Комментарий слишком длинный")]
    public string? Comment { get; set; }

    [Required(ErrorMessage = "Выберите способ связи")]
    public string ContactType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите контакт для связи")]
    [MaxLength(200, ErrorMessage = "Контакт слишком длинный")]
    public string ContactValue { get; set; } = string.Empty;

    [MaxLength(100, ErrorMessage = "Имя слишком длинное")]
    public string? ReporterName { get; set; }

    public bool PrivacyAccepted { get; set; }

    [MaxLength(20)]
    public string? PrivacyVersion { get; set; }

    // Honeypot: люди это поле не видят и не заполняют
    public string? Website { get; set; }
}

public class PublicComplaintCreatedDto
{
    public Guid Id { get; set; }
    public string Message { get; set; } = "Заявка отправлена";
}
