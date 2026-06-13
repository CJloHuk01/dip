using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Complaints;
using WaterFix.API.DTOs.Users;
using WaterFix.API.Helpers;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public UsersController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));
        return Ok(ApiResponse<UserDto>.Ok(MapDto(user)));
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        user.Name = req.Name;
        user.Phone = req.Phone;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<UserDto>.Ok(MapDto(user)));
    }

    
    [HttpPatch("notifications")]
    public async Task<IActionResult> UpdateNotifications([FromBody] UpdateNotificationsRequest req)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        user.EmailNotificationsEnabled = req.EmailNotificationsEnabled;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new
        {
            emailNotificationsEnabled = user.EmailNotificationsEnabled
        }));
    }

    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        try
        {
            _fileService.DeleteFile(user.AvatarUrl);
            user.AvatarUrl = await _fileService.SaveFileAsync(file, "avatars");
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { avatarUrl = user.AvatarUrl }));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpGet("complaints")]
    public async Task<IActionResult> GetMyComplaints(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10)
    {
        var userId = GetUserId();
        var query = _db.Complaints
            .Include(c => c.Machine)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync();

        return Ok(PagedApiResponse<ComplaintDto>.Ok(items.Select(MapComplaintDto), page, limit, total));
    }

    // ===== АДМИН =====

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null)
    {
        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(PagedApiResponse<UserDto>.Ok(users.Select(MapDto), page, limit, total));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));
        return Ok(ApiResponse<UserDto>.Ok(MapDto(user)));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] AdminUpdateUserRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        user.Name = req.Name;
        user.Email = req.Email;
        user.Phone = req.Phone;
        user.Role = req.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<UserDto>.Ok(MapDto(user)));
    }

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { message = "Пароль успешно сброшен" }));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        if (id == GetUserId())
            return BadRequest(ApiResponse<object>.Fail("Нельзя удалить самого себя"));

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Пользователь не найден"));

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    private static UserDto MapDto(Models.User u) => new()
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role,
        AvatarUrl = u.AvatarUrl,
        EmailNotificationsEnabled = u.EmailNotificationsEnabled, 
        CreatedAt = u.CreatedAt
    };

    private static ComplaintDto MapComplaintDto(Models.Complaint c) => new()
    {
        Id = c.Id,
        MachineId = c.MachineId,
        MachineAddress = c.Machine.Address,
        UserId = c.UserId,
        UserName = c.UserName,
        UserPhone = c.UserPhone,
        Type = c.Type,
        TypeLabel = c.TypeLabel,
        Comment = c.Comment,
        PhotoUrl = c.PhotoUrl,
        Status = c.Status,
        AdminComment = c.AdminComment,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}