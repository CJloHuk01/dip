using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Complaints;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/complaints")]
public class ComplaintsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public ComplaintsController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? status = null, [FromQuery] Guid? machineId = null)
    {
        var query = _db.Complaints.Include(c => c.Machine).AsQueryable();

        // Если запрос авторизован — применяем ролевую фильтрацию
        if (User.Identity?.IsAuthenticated == true)
        {
            var isAdmin = User.IsInRole("admin");
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (!isAdmin && !machineId.HasValue)
                query = query.Where(c => c.UserId == userId);
        }

        if (machineId.HasValue)
            query = query.Where(c => c.MachineId == machineId.Value);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        query = query.OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * limit).Take(limit).ToListAsync();

        return Ok(PagedApiResponse<ComplaintDto>.Ok(items.Select(MapDto), page, limit, total));
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var complaint = await _db.Complaints.Include(c => c.Machine).FirstOrDefaultAsync(c => c.Id == id);
        if (complaint == null) return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        var isAdmin = User.IsInRole("admin");
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (!isAdmin && complaint.UserId != userId)
            return Forbid();

        return Ok(ApiResponse<ComplaintDto>.Ok(MapDto(complaint)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateComplaintRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        if (!await _db.Machines.AnyAsync(m => m.Id == req.MachineId))
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        Guid? userId = null;
        string? userName = req.UserName;
        string? userPhone = req.UserPhone;

        if (User.Identity?.IsAuthenticated == true)
        {
            userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _db.Users.FindAsync(userId);
            userName = user?.Name;
            userPhone = user?.Phone;
        }

        var complaint = new Complaint
        {
            MachineId = req.MachineId,
            UserId = userId,
            UserName = userName,
            UserPhone = userPhone,
            Type = req.Type,
            TypeLabel = req.TypeLabel,
            Comment = req.Comment,
            Status = "new"
        };

        _db.Complaints.Add(complaint);
        await _db.SaveChangesAsync();

        await _db.Entry(complaint).Reference(c => c.Machine).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = complaint.Id }, ApiResponse<ComplaintDto>.Ok(MapDto(complaint)));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateComplaintRequest req)
    {
        var complaint = await _db.Complaints.Include(c => c.Machine).FirstOrDefaultAsync(c => c.Id == id);
        if (complaint == null) return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        var validStatuses = new[] { "new", "inProgress", "resolved", "rejected" };
        if (!validStatuses.Contains(req.Status))
            return BadRequest(ApiResponse<object>.Fail("Недопустимый статус"));

        complaint.Status = req.Status;
        complaint.AdminComment = req.AdminComment;
        complaint.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<ComplaintDto>.Ok(MapDto(complaint)));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var complaint = await _db.Complaints.FindAsync(id);
        if (complaint == null) return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        _fileService.DeleteFile(complaint.PhotoUrl);
        _db.Complaints.Remove(complaint);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    [HttpPost("{id}/photo")]
    public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
    {
        var complaint = await _db.Complaints.FindAsync(id);
        if (complaint == null) return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        try
        {
            _fileService.DeleteFile(complaint.PhotoUrl);
            complaint.PhotoUrl = await _fileService.SaveFileAsync(file, "complaints");
            complaint.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { photoUrl = complaint.PhotoUrl }));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    private static ComplaintDto MapDto(Complaint c) => new()
    {
        Id = c.Id, MachineId = c.MachineId, MachineAddress = c.Machine?.Address ?? "",
        UserId = c.UserId, UserName = c.UserName, UserPhone = c.UserPhone,
        Type = c.Type, TypeLabel = c.TypeLabel, Comment = c.Comment,
        PhotoUrl = c.PhotoUrl, Status = c.Status, AdminComment = c.AdminComment,
        CreatedAt = c.CreatedAt, UpdatedAt = c.UpdatedAt
    };
}
