using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.Helpers;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/stats")]
[Authorize(Roles = "admin")]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StatsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = now.AddDays(-30);

        var allComplaints = await _db.Complaints
            .Include(c => c.Machine)
            .ToListAsync();

        // Карточки
        var total = allComplaints.Count;
        var newCount = allComplaints.Count(c => c.Status == "new");
        var inProgress = allComplaints.Count(c => c.Status == "inProgress");
        var resolvedThisMonth = allComplaints.Count(c => c.Status == "resolved" && c.UpdatedAt >= monthStart);

        // Процент решённых
        var resolved = allComplaints.Count(c => c.Status == "resolved");
        var resolvedPercent = total > 0 ? Math.Round((double)resolved / total * 100, 1) : 0;

        // Среднее время решения (в часах)
        var resolvedWithTime = allComplaints
            .Where(c => c.Status == "resolved")
            .Select(c => (c.UpdatedAt - c.CreatedAt).TotalHours)
            .ToList();
        var avgResolutionHours = resolvedWithTime.Any()
            ? Math.Round(resolvedWithTime.Average(), 1)
            : 0;

        // По статусам для круговой диаграммы
        var byStatus = new[]
        {
            new { name = "Новые", value = newCount, color = "#3b82f6" },
            new { name = "В работе", value = inProgress, color = "#f59e0b" },
            new { name = "Решены", value = resolved, color = "#10b981" },
            new { name = "Отклонены", value = allComplaints.Count(c => c.Status == "rejected"), color = "#ef4444" },
        };

        // По дням за последние 30 дней для линейного графика
        var byDay = allComplaints
            .Where(c => c.CreatedAt >= thirtyDaysAgo)
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new
            {
                date = g.Key.ToString("dd.MM"),
                count = g.Count()
            })
            .OrderBy(x => x.date)
            .ToList();

        // Заполняем пропущенные дни нулями
        var filledByDay = Enumerable.Range(0, 30)
            .Select(i => thirtyDaysAgo.Date.AddDays(i))
            .Select(date => new
            {
                date = date.ToString("dd.MM"),
                count = byDay.FirstOrDefault(d => d.date == date.ToString("dd.MM"))?.count ?? 0
            })
            .ToList();

        // Топ водоматов
        var topMachines = allComplaints
            .GroupBy(c => new { c.MachineId, Address = c.Machine?.Address ?? "Неизвестно" })
            .Select(g => new
            {
                address = g.Key.Address.Length > 35
                    ? g.Key.Address.Substring(0, 35) + "..."
                    : g.Key.Address,
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
            byDay = filledByDay,
            topMachines
        }));
    }
}
