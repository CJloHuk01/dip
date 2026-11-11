namespace WaterFix.API.Models;

public class Admin
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "Администратор";
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
