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
[Route("api/admin/machines")]
public class AdminMachinesController : ControllerBase
{
    private static readonly HashSet<string> AllowedStatuses = new() { "working", "maintenance", "problem" };

    private readonly AppDbContext _db;
    private readonly FileService _fileService;

    public AdminMachinesController(AppDbContext db, FileService fileService)
    {
        _db = db;
        _fileService = fileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var machines = await _db.Machines
            .AsNoTracking()
            .OrderBy(m => m.Address)
            .ToListAsync();

        return Ok(ApiResponse<List<AdminMachineDto>>.Ok(machines.Select(MapDto).ToList()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var machine = await _db.Machines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        return Ok(ApiResponse<AdminMachineDto>.Ok(MapDto(machine)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMachineRequest request)
    {
        var status = NormalizeStatus(request.Status);
        var machine = new Machine
        {
            PublicCode = await GenerateUniqueCodeAsync(),
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Status = status,
            WorkingHours = request.WorkingHours.Trim(),
            Phone = request.Phone.Trim(),
            PaymentMethods = request.PaymentMethods,
            WaterPrice = request.WaterPrice.Trim(),
            LastMaintenance = request.LastMaintenance
        };

        _db.Machines.Add(machine);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ApiResponse<AdminMachineDto>.Ok(MapDto(machine)));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMachineRequest request)
    {
        var machine = await _db.Machines.FirstOrDefaultAsync(m => m.Id == id);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        machine.Address = request.Address.Trim();
        machine.Latitude = request.Latitude;
        machine.Longitude = request.Longitude;
        machine.Status = NormalizeStatus(request.Status);
        machine.WorkingHours = request.WorkingHours.Trim();
        machine.Phone = request.Phone.Trim();
        machine.PaymentMethods = request.PaymentMethods;
        machine.WaterPrice = request.WaterPrice.Trim();
        machine.LastMaintenance = request.LastMaintenance;
        machine.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<AdminMachineDto>.Ok(MapDto(machine)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var machine = await _db.Machines.FirstOrDefaultAsync(m => m.Id == id);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        var complaintIds = await _db.Complaints
            .Where(c => c.MachineId == id)
            .Select(c => c.Id)
            .ToListAsync();

        _fileService.DeleteFile(machine.PhotoUrl);
        _db.Machines.Remove(machine);
        await _db.SaveChangesAsync();

        foreach (var complaintId in complaintIds)
        {
            _fileService.DeleteComplaintMediaFolder(complaintId);
        }

        return Ok(ApiResponse<object>.Ok(new { message = "Водомат удалён" }));
    }

    [HttpPost("{id:guid}/photo")]
    public async Task<IActionResult> UploadPhoto(Guid id, [FromForm] IFormFile file)
    {
        var machine = await _db.Machines.FirstOrDefaultAsync(m => m.Id == id);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        try
        {
            var url = await _fileService.SaveFileAsync(file, "machines");
            _fileService.DeleteFile(machine.PhotoUrl);
            machine.PhotoUrl = url;
            machine.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<AdminMachineDto>.Ok(MapDto(machine)));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/code/regenerate")]
    public async Task<IActionResult> RegenerateCode(Guid id)
    {
        var machine = await _db.Machines.FirstOrDefaultAsync(m => m.Id == id);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден"));

        machine.PublicCode = await GenerateUniqueCodeAsync();
        machine.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<AdminMachineDto>.Ok(MapDto(machine)));
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var code = PublicCodeGenerator.Generate();
            if (!await _db.Machines.AnyAsync(m => m.PublicCode == code))
                return code;
        }

        throw new InvalidOperationException("Не удалось сгенерировать уникальный код");
    }

    private static string NormalizeStatus(string? status) =>
        !string.IsNullOrWhiteSpace(status) && AllowedStatuses.Contains(status)
            ? status
            : "working";

    private static AdminMachineDto MapDto(Machine machine) => new()
    {
        Id = machine.Id,
        PublicCode = machine.PublicCode,
        Address = machine.Address,
        Latitude = machine.Latitude,
        Longitude = machine.Longitude,
        Status = machine.Status,
        PhotoUrl = machine.PhotoUrl,
        WorkingHours = machine.WorkingHours,
        Phone = machine.Phone,
        PaymentMethods = machine.PaymentMethods,
        WaterPrice = machine.WaterPrice,
        LastMaintenance = machine.LastMaintenance,
        CreatedAt = machine.CreatedAt,
        UpdatedAt = machine.UpdatedAt
    };
}
