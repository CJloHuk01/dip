using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using WaterFix.API.Models;

namespace WaterFix.API.Services;

public class EmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(EmailSettings settings, ILogger<EmailService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task SendStatusChangedAsync(string toEmail, string userName,
        string complaintId, string oldStatus, string newStatus, string? adminComment)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(new MailboxAddress(userName, toEmail));
            message.Subject = "WaterFix — статус вашей заявки изменён";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = BuildStatusChangedHtml(userName, oldStatus, newStatus, adminComment, complaintId)
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_settings.SenderEmail, _settings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email отправлен на {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки email на {Email}", toEmail);
        }
    }

    public async Task SendNewComplaintToAdminAsync(string adminEmail, string adminName,
        string complaintId, string machineAddress, string complaintType,
        string comment, string? userName, string? userPhone)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(new MailboxAddress(adminName, adminEmail));
            message.Subject = "WaterFix — новая заявка";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = BuildNewComplaintHtml(complaintId, machineAddress, complaintType,
                    comment, userName, userPhone)
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_settings.SenderEmail, _settings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Уведомление о новой заявке отправлено админу {Email}", adminEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления о новой заявке админу {Email}", adminEmail);
        }
    }

    private string BuildStatusChangedHtml(string userName, string oldStatus,
        string newStatus, string? adminComment, string complaintId)
    {
        var statusColors = new Dictionary<string, string>
        {
            { "new", "#6b7280" },
            { "inProgress", "#f59e0b" },
            { "resolved", "#10b981" },
            { "rejected", "#ef4444" }
        };

        var statusLabels = new Dictionary<string, string>
        {
            { "new", "Новая" },
            { "inProgress", "В работе" },
            { "resolved", "Решена" },
            { "rejected", "Отклонена" }
        };

        var newColor = statusColors.GetValueOrDefault(newStatus, "#6b7280");
        var newLabel = statusLabels.GetValueOrDefault(newStatus, newStatus);
        var oldLabel = statusLabels.GetValueOrDefault(oldStatus, oldStatus);

        var adminCommentBlock = !string.IsNullOrEmpty(adminComment)
            ? $@"<div style='margin-top:16px;padding:12px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:4px;'>
                    <p style='margin:0;font-size:14px;color:#374151;'><strong>Комментарий администратора:</strong></p>
                    <p style='margin:8px 0 0;font-size:14px;color:#374151;'>{adminComment}</p>
                 </div>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;'>
  <div style='max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>
    <div style='background:#2563eb;padding:24px 32px;'>
      <h1 style='margin:0;color:white;font-size:22px;'>💧 WaterFix</h1>
      <p style='margin:4px 0 0;color:#bfdbfe;font-size:14px;'>Система управления заявками</p>
    </div>
    <div style='padding:32px;'>
      <p style='margin:0 0 16px;font-size:16px;color:#374151;'>Здравствуйте, <strong>{userName}</strong>!</p>
      <p style='margin:0 0 24px;font-size:15px;color:#374151;'>Статус вашей заявки был изменён.</p>
      <div style='display:flex;align-items:center;gap:12px;margin-bottom:24px;'>
        <div style='padding:8px 16px;background:#f1f5f9;border-radius:20px;font-size:14px;color:#6b7280;'>{oldLabel}</div>
        <span style='font-size:18px;color:#9ca3af;'>→</span>
        <div style='padding:8px 16px;background:{newColor}20;border-radius:20px;font-size:14px;color:{newColor};font-weight:600;border:1px solid {newColor}40;'>{newLabel}</div>
      </div>
      {adminCommentBlock}
      <div style='margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;'>
        <p style='margin:0;font-size:13px;color:#9ca3af;'>
          Если вы хотите отключить email-уведомления, перейдите в 
          <a href='http://localhost:5173/profile' style='color:#2563eb;'>настройки профиля</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>";
    }

    private string BuildNewComplaintHtml(string complaintId, string machineAddress,
        string complaintType, string comment, string? userName, string? userPhone)
    {
        var typeLabels = new Dictionary<string, string>
        {
            { "money", "💰 Зажевало деньги" },
            { "water", "💧 Не наливает воду" },
            { "change", "🪙 Не даёт сдачу" },
            { "screen", "📱 Сломан экран" },
            { "other", "❓ Другое" }
        };

        var typeLabel = typeLabels.GetValueOrDefault(complaintType, complaintType);
        var userBlock = !string.IsNullOrEmpty(userName)
            ? $@"<div style='margin-bottom:8px;'>
                    <span style='font-size:13px;color:#6b7280;'>Пользователь:</span>
                    <span style='font-size:14px;color:#374151;margin-left:8px;'>{userName}</span>
                 </div>"
            : "<div style='margin-bottom:8px;'><span style='font-size:13px;color:#6b7280;'>Пользователь:</span><span style='font-size:14px;color:#374151;margin-left:8px;'>Аноним</span></div>";

        var phoneBlock = !string.IsNullOrEmpty(userPhone)
            ? $@"<div style='margin-bottom:8px;'>
                    <span style='font-size:13px;color:#6b7280;'>Телефон:</span>
                    <span style='font-size:14px;color:#374151;margin-left:8px;'>{userPhone}</span>
                 </div>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;'>
  <div style='max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>
    
    <div style='background:#2563eb;padding:24px 32px;'>
      <h1 style='margin:0;color:white;font-size:22px;'>💧 WaterFix</h1>
      <p style='margin:4px 0 0;color:#bfdbfe;font-size:14px;'>Система управления заявками</p>
    </div>

    <div style='padding:32px;'>
      <div style='display:inline-block;padding:6px 14px;background:#fef3c7;border-radius:20px;margin-bottom:20px;'>
        <span style='font-size:13px;color:#d97706;font-weight:600;'>🔔 Новая заявка</span>
      </div>

      <h2 style='margin:0 0 20px;font-size:18px;color:#111827;'>Поступила новая заявка</h2>

      <div style='background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;'>
        <div style='margin-bottom:8px;'>
          <span style='font-size:13px;color:#6b7280;'>Адрес водомата:</span>
          <span style='font-size:14px;color:#374151;margin-left:8px;font-weight:500;'>{machineAddress}</span>
        </div>
        <div style='margin-bottom:8px;'>
          <span style='font-size:13px;color:#6b7280;'>Тип проблемы:</span>
          <span style='font-size:14px;color:#374151;margin-left:8px;'>{typeLabel}</span>
        </div>
        {userBlock}
        {phoneBlock}
      </div>

      <div style='background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;'>
        <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>Комментарий:</p>
        <p style='margin:0;font-size:14px;color:#374151;'>{comment}</p>
      </div>

      <a href='http://localhost:5173/admin' 
         style='display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;'>
        Открыть панель администратора →
      </a>
    </div>

  </div>
</body>
</html>";
    }
}