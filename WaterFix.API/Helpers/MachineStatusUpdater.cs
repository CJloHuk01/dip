using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;

namespace WaterFix.API.Helpers;

public static class MachineStatusUpdater
{
    public static async Task UpdateAsync(AppDbContext db, Guid machineId, CancellationToken ct = default)
    {
        var machine = await db.Machines.FirstOrDefaultAsync(m => m.Id == machineId, ct);
        if (machine is null) return;

        var hasNew = await db.Complaints.AnyAsync(c => c.MachineId == machineId && c.Status == "new", ct);
        var hasInProgress = await db.Complaints.AnyAsync(c => c.MachineId == machineId && c.Status == "inProgress", ct);

        machine.Status = hasNew ? "problem" : hasInProgress ? "maintenance" : "working";
        machine.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
