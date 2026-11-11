namespace WaterFix.API.Services;

/// <summary>
/// Отправляет письма из очереди в фоне, с несколькими попытками.
/// </summary>
public class EmailBackgroundService : BackgroundService
{
    private readonly EmailQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailBackgroundService> _logger;

    public EmailBackgroundService(
        EmailQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<EmailBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.ReadAllAsync(stoppingToken))
        {
            for (var attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

                    await emailService.SendNewComplaintToAdminAsync(
                        job.AdminEmail,
                        job.AdminName,
                        job.ComplaintId,
                        job.MachineAddress,
                        job.ComplaintType,
                        job.ComplaintTypeLabel,
                        job.Comment,
                        job.ContactType,
                        job.ContactValue,
                        job.ReporterName,
                        job.MediaCount,
                        throwOnError: true);

                    break;
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    if (attempt == 3)
                    {
                        _logger.LogError(
                            ex,
                            "Не удалось отправить письмо о заявке {ComplaintId} на {Email} после 3 попыток",
                            job.ComplaintId,
                            job.AdminEmail);
                        break;
                    }

                    _logger.LogWarning(
                        ex,
                        "Попытка {Attempt}/3 отправить письмо о заявке {ComplaintId} не удалась",
                        attempt,
                        job.ComplaintId);

                    await Task.Delay(TimeSpan.FromSeconds(attempt * 5), stoppingToken);
                }
            }
        }
    }
}
