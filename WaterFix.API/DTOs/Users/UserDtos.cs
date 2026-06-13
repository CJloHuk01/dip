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

public class UserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool EmailNotificationsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminUpdateUserRequest
{
    [Required(ErrorMessage = "Имя обязательно")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email обязателен")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Phone]
    public string? Phone { get; set; }

    [Required]
    public string Role { get; set; } = "user";
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = "Новый пароль обязателен")]
    [MinLength(6, ErrorMessage = "Пароль минимум 6 символов")]
    public string NewPassword { get; set; } = string.Empty;
}
