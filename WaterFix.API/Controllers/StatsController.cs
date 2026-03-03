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

    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var totalMachines = await _db.Machines.CountAsync();
        var workingMachines = await _db.Machines.CountAsync(m => m.Status == "working");
        var maintenanceMachines = await _db.Machines.CountAsync(m => m.Status == "maintenance");
        var problemMachines = await _db.Machines.CountAsync(m => m.Status == "problem");

        var totalComplaints = await _db.Complaints.CountAsync();
        var newComplaints = await _db.Complaints.CountAsync(c => c.Status == "new");
        var inProgressComplaints = await _db.Complaints.CountAsync(c => c.Status == "inProgress");
        var resolvedComplaints = await _db.Complaints.CountAsync(c => c.Status == "resolved");
        var rejectedComplaints = await _db.Complaints.CountAsync(c => c.Status == "rejected");

        var totalUsers = await _db.Users.CountAsync(u => u.Role == "user");

        return Ok(ApiResponse<object>.Ok(new
        {
            machines = new { total = totalMachines, working = workingMachines, maintenance = maintenanceMachines, problem = problemMachines },
            complaints = new { total = totalComplaints, @new = newComplaints, inProgress = inProgressComplaints, resolved = resolvedComplaints, rejected = rejectedComplaints },
            users = new { total = totalUsers }
        }));
    }

    [HttpGet("complaints")]
    public async Task<IActionResult> ComplaintStats()
    {
        var byType = await _db.Complaints
            .GroupBy(c => c.Type)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToListAsync();

        var byStatus = await _db.Complaints
            .GroupBy(c => c.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        // По месяцам (последние 6)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var byMonth = await _db.Complaints
            .Where(c => c.CreatedAt >= sixMonthsAgo)
            .GroupBy(c => new { c.CreatedAt.Year, c.CreatedAt.Month })
            .Select(g => new { year = g.Key.Year, month = g.Key.Month, count = g.Count() })
            .OrderBy(x => x.year).ThenBy(x => x.month)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(new { byType, byStatus, byMonth }));
    }

    [HttpGet("machines")]
    public async Task<IActionResult> MachineStats()
    {
        var topProblematic = await _db.Machines
            .Select(m => new
            {
                id = m.Id,
                address = m.Address,
                status = m.Status,
                complaintsCount = m.Complaints.Count,
                newComplaints = m.Complaints.Count(c => c.Status == "new")
            })
            .OrderByDescending(x => x.complaintsCount)
            .Take(10)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(new { topProblematic }));
    }
}
