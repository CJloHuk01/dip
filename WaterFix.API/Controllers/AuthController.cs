using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Auth;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;

    public AuthController(AppDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(string.Join(", ", ModelState.Values
                .SelectMany(v => v.Errors).Select(e => e.ErrorMessage))));

        if (await _db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(ApiResponse<object>.Fail("Пользователь с таким email уже существует"));

        var user = new User
        {
            Name = req.Name,
            Email = req.Email.ToLower(),
            Phone = req.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "user"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwt.GenerateToken(user);
        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            Token = token,
            User = MapUserDto(user)
        }));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(ApiResponse<object>.Fail("Неверный email или пароль"));

        var token = _jwt.GenerateToken(user);
        return Ok(ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            Token = token,
            User = MapUserDto(user)
        }));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        return Ok(ApiResponse<UserDto>.Ok(MapUserDto(user)));
    }

    private static UserDto MapUserDto(User u) => new()
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role,
        AvatarUrl = u.AvatarUrl,
        CreatedAt = u.CreatedAt
    };
}
