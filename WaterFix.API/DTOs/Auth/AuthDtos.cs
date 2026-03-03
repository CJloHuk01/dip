using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Имя обязательно")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email обязателен")]
    [EmailAddress(ErrorMessage = "Некорректный email")]
    public string Email { get; set; } = string.Empty;

    [Phone]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Пароль обязателен")]
    [MinLength(6, ErrorMessage = "Пароль минимум 6 символов")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required(ErrorMessage = "Email обязателен")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Пароль обязателен")]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
