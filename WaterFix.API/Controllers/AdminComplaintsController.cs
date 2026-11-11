using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Admin;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/complaints")]
public class AdminComplaintsController : ControllerBase
{
    private static readonly HashSet<string> AllowedStatuses = new() { "new", "inProgress", "resolved", "rejected" };

    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public AdminComplaintsController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Complaints
            .AsNoTracking()
            .Include(c => c.Machine)
            .Include(c => c.Media)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(PagedApiResponse<AdminComplaintDto>.Ok(items.Select(MapDto), page, limit, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var complaint = await _db.Complaints
            .AsNoTracking()
            .Include(c => c.Machine)
            .Include(c => c.Media)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint is null)
            return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        return Ok(ApiResponse<AdminComplaintDto>.Ok(MapDto(complaint)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateComplaintRequest request)
    {
        var status = request.Status.Trim();
        if (!AllowedStatuses.Contains(status))
            return BadRequest(ApiResponse<object>.Fail("Некорректный статус"));

        var complaint = await _db.Complaints
            .Include(c => c.Machine)
            .Include(c => c.Media)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint is null)
            return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        complaint.Status = status;
        complaint.AdminComment = string.IsNullOrWhiteSpace(request.AdminComment)
            ? null
            : request.AdminComment.Trim();
        complaint.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await MachineStatusUpdater.UpdateAsync(_db, complaint.MachineId);

        return Ok(ApiResponse<AdminComplaintDto>.Ok(MapDto(complaint)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var complaint = await _db.Complaints
            .Include(c => c.Media)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (complaint is null)
            return NotFound(ApiResponse<object>.Fail("Заявка не найдена"));

        var machineId = complaint.MachineId;
        var complaintId = complaint.Id;

        _db.Complaints.Remove(complaint);
        await _db.SaveChangesAsync();

        _fileService.DeleteComplaintMediaFolder(complaintId);
        await MachineStatusUpdater.UpdateAsync(_db, machineId);

        return Ok(ApiResponse<object>.Ok(new { message = "Заявка удалена" }));
    }

    private static AdminComplaintDto MapDto(Complaint complaint) => new()
    {
        Id = complaint.Id,
        MachineId = complaint.MachineId,
        MachineAddress = complaint.Machine?.Address ?? "Неизвестно",
        MachineCode = complaint.Machine?.PublicCode,
        ReporterName = complaint.ReporterName,
        ContactType = complaint.ContactType,
        ContactValue = complaint.ContactValue,
        Type = complaint.Type,
        TypeLabel = complaint.TypeLabel,
        Comment = complaint.Comment,
        Status = complaint.Status,
        AdminComment = complaint.AdminComment,
        PrivacyAcceptedAt = complaint.PrivacyAcceptedAt,
        PrivacyVersion = complaint.PrivacyVersion,
        CreatedAt = complaint.CreatedAt,
        UpdatedAt = complaint.UpdatedAt,
        Media = complaint.Media
            .OrderBy(m => m.SortOrder)
            .Select(m => new ComplaintMediaDto
            {
                Id = m.Id,
                MediaType = m.MediaType,
                ContentType = m.ContentType,
                SizeBytes = m.SizeBytes,
                Url = $"/api/admin/media/{m.Id}"
            })
            .ToList()
    };
}
