using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WaterFix.API.Data;
using WaterFix.API.DTOs.Chat;
using WaterFix.API.Helpers;
using WaterFix.API.Models;

namespace WaterFix.API.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/chat/messages?companionId=xxx — получить переписку с конкретным пользователем
    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages([FromQuery] Guid? companionId, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var userId = GetUserId();

        IQueryable<ChatMessage> query;

        if (User.IsInRole("admin"))
        {
            // Админ видит переписку с конкретным пользователем
            if (!companionId.HasValue)
                return BadRequest(ApiResponse<object>.Fail("Укажите companionId"));

            query = _db.ChatMessages
                .Where(m =>
                    (m.SenderId == userId && m.ReceiverId == companionId.Value) ||
                    (m.SenderId == companionId.Value && m.ReceiverId == userId));
        }
        else
        {
            // Пользователь видит только свою переписку с администратором
            var adminId = await _db.Users
                .Where(u => u.Role == "admin")
                .Select(u => u.Id)
                .FirstOrDefaultAsync();

            query = _db.ChatMessages
                .Where(m =>
                    (m.SenderId == userId && m.ReceiverId == adminId) ||
                    (m.SenderId == adminId && m.ReceiverId == userId));
        }

        query = query.OrderByDescending(m => m.SentAt);

        var total = await query.CountAsync();
        var messages = await query.Skip((page - 1) * limit).Take(limit).ToListAsync();

        // Помечаем входящие как прочитанные
        var unread = messages.Where(m => m.ReceiverId == userId && !m.IsRead).ToList();
        foreach (var msg in unread)
        {
            msg.IsRead = true;
        }
        if (unread.Any())
            await _db.SaveChangesAsync();

        return Ok(PagedApiResponse<ChatMessageDto>.Ok(
            messages.OrderBy(m => m.SentAt).Select(MapDto),
            page, limit, total));
    }

    // GET /api/chat/dialogs — список диалогов для админа
    [HttpGet("dialogs")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDialogs()
    {
        var adminId = GetUserId();

        // Найти всех пользователей у которых есть переписка с админом
        var userIds = await _db.ChatMessages
            .Where(m => m.SenderId == adminId || m.ReceiverId == adminId)
            .Select(m => m.SenderId == adminId ? m.ReceiverId : m.SenderId)
            .Distinct()
            .ToListAsync();

        var dialogs = new List<DialogDto>();

        foreach (var uid in userIds)
        {
            var user = await _db.Users.FindAsync(uid);
            if (user == null) continue;

            var lastMessage = await _db.ChatMessages
                .Where(m =>
                    (m.SenderId == adminId && m.ReceiverId == uid) ||
                    (m.SenderId == uid && m.ReceiverId == adminId))
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();

            var unreadCount = await _db.ChatMessages
                .CountAsync(m => m.SenderId == uid && m.ReceiverId == adminId && !m.IsRead);

            dialogs.Add(new DialogDto
            {
                UserId = uid,
                UserName = user.Name,
                UserEmail = user.Email,
                AvatarUrl = user.AvatarUrl,
                LastMessage = lastMessage?.Message ?? "",
                LastMessageAt = lastMessage?.SentAt ?? DateTime.MinValue,
                UnreadCount = unreadCount
            });
        }

        return Ok(ApiResponse<IEnumerable<DialogDto>>.Ok(
            dialogs.OrderByDescending(d => d.LastMessageAt)));
    }

    // POST /api/chat/messages — отправить сообщение
    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest(ApiResponse<object>.Fail("Сообщение не может быть пустым"));

        var senderId = GetUserId();
        Guid receiverId;

        if (User.IsInRole("admin"))
        {
            // Админ отправляет конкретному пользователю
            if (req.ReceiverId == Guid.Empty)
                return BadRequest(ApiResponse<object>.Fail("Укажите получателя"));
            receiverId = req.ReceiverId;
        }
        else
        {
            // Пользователь отправляет первому администратору
            var admin = await _db.Users.FirstOrDefaultAsync(u => u.Role == "admin");
            if (admin == null)
                return NotFound(ApiResponse<object>.Fail("Администратор недоступен"));
            receiverId = admin.Id;
        }

        // Проверяем что получатель существует
        if (!await _db.Users.AnyAsync(u => u.Id == receiverId))
            return NotFound(ApiResponse<object>.Fail("Получатель не найден"));

        var message = new ChatMessage
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Message = req.Message.Trim(),
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<ChatMessageDto>.Ok(MapDto(message)));
    }

    // GET /api/chat/unread — количество непрочитанных для текущего пользователя
    [HttpGet("unread")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var count = await _db.ChatMessages
            .CountAsync(m => m.ReceiverId == userId && !m.IsRead);
        return Ok(ApiResponse<object>.Ok(new { count }));
    }

    private static ChatMessageDto MapDto(ChatMessage m) => new()
    {
        Id = m.Id,
        SenderId = m.SenderId,
        ReceiverId = m.ReceiverId,
        Message = m.Message,
        SentAt = m.SentAt,
        IsRead = m.IsRead
    };

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
