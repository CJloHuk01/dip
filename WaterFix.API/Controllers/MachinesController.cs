using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Machines;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/machines")]
public class MachinesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public MachinesController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] double? radius,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var query = _db.Machines.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(m => m.Status == status);

        var machines = await query.OrderBy(m => m.CreatedAt).ToListAsync();

        // Фильтрация по радиусу (в метрах)
        IEnumerable<(Machine m, double? dist)> withDist = machines.Select(m =>
        {
            double? dist = null;
            if (lat.HasValue && lng.HasValue)
            {
                dist = HaversineDistance(lat.Value, lng.Value, m.Latitude, m.Longitude);
                return (m, (double?)dist);
            }
            return (m, dist);
        });

        if (lat.HasValue && lng.HasValue && radius.HasValue)
            withDist = withDist.Where(x => x.dist <= radius.Value);

        var total = withDist.Count();
        var paged = withDist.Skip((page - 1) * limit).Take(limit);

        var data = paged.Select(x => MapDto(x.m, x.dist));
        return Ok(PagedApiResponse<MachineDto>.Ok(data, page, limit, total));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var m = await _db.Machines.FindAsync(id);
        if (m == null) return NotFound(ApiResponse<object>.Fail("Водомат не найден"));
        return Ok(ApiResponse<MachineDto>.Ok(MapDto(m, null)));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateMachineRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        var machine = new Machine
        {
            Address = req.Address,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Status = req.Status,
            WorkingHours = req.WorkingHours,
            Phone = req.Phone,
            PaymentMethods = req.PaymentMethods,
            WaterPrice = req.WaterPrice,
            LastMaintenance = req.LastMaintenance
        };

        _db.Machines.Add(machine);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = machine.Id }, ApiResponse<MachineDto>.Ok(MapDto(machine, null)));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMachineRequest req)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Некорректные данные"));

        var machine = await _db.Machines.FindAsync(id);
        if (machine == null) return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        machine.Address = req.Address;
        machine.Latitude = req.Latitude;
        machine.Longitude = req.Longitude;
        machine.Status = req.Status;
        machine.WorkingHours = req.WorkingHours;
        machine.Phone = req.Phone;
        machine.PaymentMethods = req.PaymentMethods;
        machine.WaterPrice = req.WaterPrice;
        machine.LastMaintenance = req.LastMaintenance;
        machine.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<MachineDto>.Ok(MapDto(machine, null)));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var machine = await _db.Machines.FindAsync(id);
        if (machine == null) return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        _db.Machines.Remove(machine);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    [HttpPost("{id}/photo")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
    {
        var machine = await _db.Machines.FindAsync(id);
        if (machine == null) return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        try
        {
            _fileService.DeleteFile(machine.PhotoUrl);
            machine.PhotoUrl = await _fileService.SaveFileAsync(file, "machines");
            machine.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { photoUrl = machine.PhotoUrl }));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    private static MachineDto MapDto(Machine m, double? dist) => new()
    {
        Id = m.Id, Address = m.Address, Latitude = m.Latitude, Longitude = m.Longitude,
        Status = m.Status, PhotoUrl = m.PhotoUrl, WorkingHours = m.WorkingHours,
        Phone = m.Phone, PaymentMethods = m.PaymentMethods, WaterPrice = m.WaterPrice,
        LastMaintenance = m.LastMaintenance, CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt,
        Distance = dist
    };

    // Расстояние Haversine в метрах
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
