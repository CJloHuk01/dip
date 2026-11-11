using System.Net;
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

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.SmtpHost) &&
        !string.IsNullOrWhiteSpace(_settings.SenderEmail) &&
        !string.IsNullOrWhiteSpace(_settings.Password);

    public async Task SendNewComplaintToAdminAsync(
        string adminEmail,
        string adminName,
        string complaintId,
        string machineAddress,
        string complaintType,
        string complaintTypeLabel,
        string comment,
        string contactType,
        string contactValue,
        string? reporterName,
        int mediaCount,
        bool throwOnError = false)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Email не настроен: пропускаю уведомление о новой заявке для {Email}", adminEmail);
            return;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
            message.To.Add(new MailboxAddress(adminName, adminEmail));
            message.Subject = $"WaterFix — новая заявка: {machineAddress}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = BuildNewComplaintHtml(
                    complaintId, machineAddress, complaintType, complaintTypeLabel,
                    comment, contactType, contactValue, reporterName, mediaCount)
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient { Timeout = 15000 };
            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.Auto);
            await client.AuthenticateAsync(_settings.SenderEmail, _settings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Уведомление о новой заявке отправлено админу {Email}", adminEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка отправки уведомления о новой заявке админу {Email}", adminEmail);
            if (throwOnError) throw;
        }
    }

    private string BuildNewComplaintHtml(
        string complaintId,
        string machineAddress,
        string complaintType,
        string complaintTypeLabel,
        string comment,
        string contactType,
        string contactValue,
        string? reporterName,
        int mediaCount)
    {
        var typeLabels = new Dictionary<string, string>
        {
            { "money", "💰 Зажевало деньги" },
            { "water", "💧 Не наливает воду" },
            { "change", "🪙 Не даёт сдачу" },
            { "screen", "📱 Сломан экран" },
            { "other", "❓ Другое" }
        };

        var contactLabels = new Dictionary<string, string>
        {
            { "phone", "Телефон" },
            { "email", "Email" },
            { "telegram", "Telegram" },
            { "vk", "ВКонтакте" },
            { "max", "MAX" },
            { "other", "Другое" }
        };

        var typeLabel = typeLabels.GetValueOrDefault(complaintType, complaintTypeLabel);
        var contactLabel = contactLabels.GetValueOrDefault(contactType, contactType);
        var name = string.IsNullOrWhiteSpace(reporterName) ? "Не указано" : reporterName;

        var mediaBlock = mediaCount > 0
            ? $"<div style='margin-bottom:8px;'><span style='font-size:13px;color:#6b7280;'>Вложения:</span><span style='font-size:14px;color:#374151;margin-left:8px;'>{mediaCount} файл(ов) — смотреть в админ-панели</span></div>"
            : "";

        var commentBlock = string.IsNullOrWhiteSpace(comment)
            ? ""
            : $@"<div style='background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;'>
                    <p style='margin:0 0 8px;font-size:13px;color:#6b7280;'>Комментарий:</p>
                    <p style='margin:0;font-size:14px;color:#374151;'>{Enc(comment)}</p>
                 </div>";

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
          <span style='font-size:14px;color:#374151;margin-left:8px;font-weight:500;'>{Enc(machineAddress)}</span>
        </div>
        <div style='margin-bottom:8px;'>
          <span style='font-size:13px;color:#6b7280;'>Тип проблемы:</span>
          <span style='font-size:14px;color:#374151;margin-left:8px;'>{Enc(typeLabel)}</span>
        </div>
        <div style='margin-bottom:8px;'>
          <span style='font-size:13px;color:#6b7280;'>Имя:</span>
          <span style='font-size:14px;color:#374151;margin-left:8px;'>{Enc(name)}</span>
        </div>
        <div style='margin-bottom:8px;'>
          <span style='font-size:13px;color:#6b7280;'>{Enc(contactLabel)}:</span>
          <span style='font-size:14px;color:#374151;margin-left:8px;'>{Enc(contactValue)}</span>
        </div>
        {mediaBlock}
      </div>

      {commentBlock}

      <a href='https://www.water-fix.ru/admin'
         style='display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;'>
        Открыть панель администратора →
      </a>

      <p style='margin:20px 0 0;font-size:12px;color:#9ca3af;'>Заявка ID: {complaintId}</p>
    </div>
  </div>
</body>
</html>";
    }

    private static string Enc(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
}
