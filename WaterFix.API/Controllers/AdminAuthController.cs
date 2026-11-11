using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Admin;
using WaterFix.API.Helpers;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<AdminAuthController> _logger;

    public AdminAuthController(
        AppDbContext db,
        JwtService jwt,
        JwtSettings jwtSettings,
        ILogger<AdminAuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _jwtSettings = jwtSettings;
        _logger = logger;
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var admin = await _db.Admins.FirstOrDefaultAsync(a => a.Email == email);

        if (admin is null || !BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
        {
            _logger.LogWarning("Неудачная попытка входа в админку: {Email}", email);
            return Unauthorized(ApiResponse<object>.Fail("Неверный email или пароль"));
        }

        var token = _jwt.GenerateToken(admin);
        Response.Cookies.Append(AuthConstants.AdminCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(_jwtSettings.AdminSessionHours),
            Path = "/"
        });

        return Ok(ApiResponse<AdminDto>.Ok(MapDto(admin)));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AuthConstants.AdminCookieName, new CookieOptions { Path = "/" });
        return Ok(ApiResponse<object>.Ok(new { message = "Выход выполнен" }));
    }

    [Authorize(Roles = "admin")]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(idValue, out var id))
            return Unauthorized(ApiResponse<object>.Fail("Требуется вход"));

        var admin = await _db.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (admin is null) return Unauthorized(ApiResponse<object>.Fail("Требуется вход"));

        return Ok(ApiResponse<AdminDto>.Ok(MapDto(admin)));
    }

    private static AdminDto MapDto(Models.Admin admin) => new()
    {
        Id = admin.Id,
        Name = admin.Name,
        Email = admin.Email
    };
}
