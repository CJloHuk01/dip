using System.ComponentModel.DataAnnotations;

namespace WaterFix.API.DTOs.Admin;

public class AdminLoginRequest
{
    [Required(ErrorMessage = "Укажите email")]
    [EmailAddress(ErrorMessage = "Некорректный email")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите пароль")]
    public string Password { get; set; } = string.Empty;
}

public class AdminDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
