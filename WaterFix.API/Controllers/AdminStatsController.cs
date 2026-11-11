using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.Helpers;

namespace WaterFix.API.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin/stats")]
public class AdminStatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminStatsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var complaints = await _db.Complaints
            .AsNoTracking()
            .Include(c => c.Machine)
            .ToListAsync();

        var total = complaints.Count;
        var newCount = complaints.Count(c => c.Status == "new");
        var inProgress = complaints.Count(c => c.Status == "inProgress");
        var resolved = complaints.Where(c => c.Status == "resolved").ToList();

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var resolvedThisMonth = resolved.Count(c => c.UpdatedAt >= monthStart);
        var resolvedPercent = total == 0 ? 0 : Math.Round(resolved.Count * 100.0 / total, 1);
        var avgResolutionHours = resolved.Count == 0
            ? 0
            : Math.Round(resolved.Average(c => (c.UpdatedAt - c.CreatedAt).TotalHours), 1);

        var byStatus = new[]
        {
            new { name = "Новые", value = newCount, color = "#3b82f6" },
            new { name = "В работе", value = inProgress, color = "#f59e0b" },
            new { name = "Решены", value = resolved.Count, color = "#10b981" },
            new { name = "Отклонены", value = complaints.Count(c => c.Status == "rejected"), color = "#ef4444" }
        };

        var startDay = DateTime.UtcNow.Date.AddDays(-29);
        var countsByDay = complaints
            .Where(c => c.CreatedAt >= startDay)
            .GroupBy(c => c.CreatedAt.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var byDay = Enumerable.Range(0, 30)
            .Select(offset => startDay.AddDays(offset))
            .Select(day => new
            {
                date = day.ToString("dd.MM"),
                count = countsByDay.GetValueOrDefault(day, 0)
            })
            .ToList();

        var topMachines = complaints
            .GroupBy(c => new { c.MachineId, Address = c.Machine?.Address ?? "Неизвестно" })
            .Select(g => new
            {
                address = g.Key.Address.Length > 35 ? g.Key.Address[..35] + "…" : g.Key.Address,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            cards = new
            {
                total,
                newCount,
                inProgress,
                resolvedThisMonth,
                resolvedPercent,
                avgResolutionHours
            },
            byStatus,
            byDay,
            topMachines
        }));
    }
}
