using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Auth;
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

        return Ok(ApiResponse<UserDto>.Ok(new UserDto
        {
            Id = user.Id, Name = user.Name, Email = user.Email,
            Phone = user.Phone, Role = user.Role, AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt
        }));
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

        return Ok(ApiResponse<UserDto>.Ok(new UserDto
        {
            Id = user.Id, Name = user.Name, Email = user.Email,
            Phone = user.Phone, Role = user.Role, AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt
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
    public async Task<IActionResult> GetMyComplaints([FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        var userId = GetUserId();
        var query = _db.Complaints.Include(c => c.Machine)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync();

        var data = items.Select(c => new ComplaintDto
        {
            Id = c.Id, MachineId = c.MachineId, MachineAddress = c.Machine.Address,
            UserId = c.UserId, UserName = c.UserName, UserPhone = c.UserPhone,
            Type = c.Type, TypeLabel = c.TypeLabel, Comment = c.Comment,
            PhotoUrl = c.PhotoUrl, Status = c.Status, AdminComment = c.AdminComment,
            CreatedAt = c.CreatedAt, UpdatedAt = c.UpdatedAt
        });

        return Ok(PagedApiResponse<ComplaintDto>.Ok(data, page, limit, total));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
