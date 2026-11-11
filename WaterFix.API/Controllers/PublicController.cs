using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Public;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private static readonly HashSet<string> AllowedTypes = new() { "money", "water", "change", "screen", "other" };
    private static readonly HashSet<string> AllowedContacts = new() { "phone", "email", "telegram", "vk", "max", "other" };

    private static readonly Dictionary<string, string> TypeLabels = new()
    {
        { "money", "Зажевало деньги" },
        { "water", "Не наливает воду" },
        { "change", "Не даёт сдачу" },
        { "screen", "Сломан экран" },
        { "other", "Другое" }
    };

    private readonly AppDbContext _db;
    private readonly FileService _fileService;
    private readonly FileSettings _fileSettings;
    private readonly EmailQueue _emailQueue;
    private readonly ILogger<PublicController> _logger;

    public PublicController(
        AppDbContext db,
        FileService fileService,
        FileSettings fileSettings,
        EmailQueue emailQueue,
        ILogger<PublicController> logger)
    {
        _db = db;
        _fileService = fileService;
        _fileSettings = fileSettings;
        _emailQueue = emailQueue;
        _logger = logger;
    }

    [HttpGet("machines/{code}")]
    [EnableRateLimiting("public-read")]
    public async Task<IActionResult> GetMachine(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var machine = await _db.Machines.AsNoTracking()
            .FirstOrDefaultAsync(m => m.PublicCode == normalized);

        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден. Проверьте QR-код."));

        return Ok(ApiResponse<PublicMachineDto>.Ok(new PublicMachineDto
        {
            Id = machine.Id,
            Address = machine.Address,
            Status = machine.Status,
            PhotoUrl = machine.PhotoUrl,
            WorkingHours = machine.WorkingHours,
            Phone = machine.Phone,
            WaterPrice = machine.WaterPrice
        }));
    }

    [HttpPost("complaints")]
    [EnableRateLimiting("public-complaints")]
    [RequestSizeLimit(120_000_000)]
    public async Task<IActionResult> CreateComplaint(
        [FromForm] CreatePublicComplaintRequest request,
        [FromForm] List<IFormFile>? photos,
        [FromForm] IFormFile? video)
    {
        // Honeypot: боты заполняют скрытое поле — отвечаем «успехом», но ничего не сохраняем
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return Ok(ApiResponse<PublicComplaintCreatedDto>.Ok(new PublicComplaintCreatedDto
            {
                Id = Guid.NewGuid(),
                Message = "Заявка отправлена"
            }));
        }

        if (!request.PrivacyAccepted)
            return BadRequest(ApiResponse<object>.Fail("Необходимо согласие на обработку персональных данных"));

        var contactType = (request.ContactType ?? "").Trim().ToLowerInvariant();
        if (!AllowedContacts.Contains(contactType))
            return BadRequest(ApiResponse<object>.Fail("Выберите способ связи"));

        var contactValue = (request.ContactValue ?? "").Trim();
        if (contactValue.Length < 3)
            return BadRequest(ApiResponse<object>.Fail("Укажите контакт для связи"));

        if (contactType == "email" && !new EmailAddressAttribute().IsValid(contactValue))
            return BadRequest(ApiResponse<object>.Fail("Некорректный email"));

        if (contactType == "phone")
        {
            var allowed = contactValue.All(c => char.IsDigit(c) || c == '+' || c == '(' || c == ')' || c == '-' || char.IsWhiteSpace(c));
            if (!allowed)
                return BadRequest(ApiResponse<object>.Fail("Телефон может содержать только цифры, +, скобки, дефис и пробелы"));

            var digits = new string(contactValue.Where(char.IsDigit).ToArray());
            if (digits.Length < 10 || digits.Length > 15)
                return BadRequest(ApiResponse<object>.Fail("Укажите корректный номер телефона (10–15 цифр)"));
        }

        var type = (request.Type ?? "").Trim().ToLowerInvariant();
        if (!AllowedTypes.Contains(type))
            return BadRequest(ApiResponse<object>.Fail("Выберите проблему"));

        if (photos is { Count: > 0 } && photos.Count > _fileSettings.MaxPhotosPerComplaint)
            return BadRequest(ApiResponse<object>.Fail($"Можно прикрепить не более {_fileSettings.MaxPhotosPerComplaint} фото"));

        var code = (request.MachineCode ?? "").Trim().ToUpperInvariant();
        var machine = await _db.Machines.FirstOrDefaultAsync(m => m.PublicCode == code);
        if (machine is null)
            return NotFound(ApiResponse<object>.Fail("Водомат не найден. Проверьте QR-код."));

        var complaint = new Complaint
        {
            MachineId = machine.Id,
            ReporterName = TrimOrNull(request.ReporterName, 100),
            ContactType = contactType,
            ContactValue = contactValue,
            Type = type,
            TypeLabel = TypeLabels.GetValueOrDefault(type, (request.TypeLabel ?? "").Trim()),
            Comment = request.Comment?.Trim() ?? string.Empty,
            Status = "new",
            PrivacyAcceptedAt = DateTime.UtcNow,
            PrivacyVersion = string.IsNullOrWhiteSpace(request.PrivacyVersion) ? "1.0" : request.PrivacyVersion.Trim()
        };

        _db.Complaints.Add(complaint);
        await _db.SaveChangesAsync();

        var media = new List<ComplaintMedia>();
        try
        {
            if (photos is { Count: > 0 })
            {
                for (var i = 0; i < photos.Count; i++)
                {
                    media.Add(await _fileService.SaveComplaintMediaAsync(complaint.Id, photos[i], "photo", i));
                }
            }

            if (video is { Length: > 0 })
            {
                media.Add(await _fileService.SaveComplaintMediaAsync(complaint.Id, video, "video", media.Count));
            }

            if (media.Count > 0)
            {
                _db.ComplaintMedia.AddRange(media);
                await _db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Не удалось сохранить вложения заявки {ComplaintId}", complaint.Id);
            _fileService.DeleteComplaintMediaFolder(complaint.Id);
            _db.Complaints.Remove(complaint);
            await _db.SaveChangesAsync();
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }

        await MachineStatusUpdater.UpdateAsync(_db, machine.Id);

        var admins = await _db.Admins.AsNoTracking().ToListAsync();
        foreach (var admin in admins)
        {
            _emailQueue.Enqueue(new NewComplaintEmailJob(
                admin.Email,
                admin.Name,
                complaint.Id.ToString(),
                machine.Address,
                complaint.Type,
                complaint.TypeLabel,
                complaint.Comment,
                complaint.ContactType,
                complaint.ContactValue,
                complaint.ReporterName,
                media.Count));
        }

        return StatusCode(StatusCodes.Status201Created, ApiResponse<PublicComplaintCreatedDto>.Ok(
            new PublicComplaintCreatedDto { Id = complaint.Id, Message = "Заявка отправлена" }));
    }

    private static string? TrimOrNull(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length > maxLength ? trimmed[..maxLength] : trimmed;
    }
}
