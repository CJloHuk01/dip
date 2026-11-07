namespace WaterFix.API.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "user";
    public string? AvatarUrl { get; set; }
    public bool EmailNotificationsEnabled { get; set; } = true;

    // Согласия при регистрации (152-ФЗ)
    public DateTime? TermsAcceptedAt { get; set; }
    public DateTime? PrivacyAcceptedAt { get; set; }
    public string? TermsVersion { get; set; }
    public string? PrivacyVersion { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Complaint> Complaints { get; set; } = new List<Complaint>();
}
