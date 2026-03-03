using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Users;

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "Имя обязательно")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Phone]
    public string? Phone { get; set; }
}
