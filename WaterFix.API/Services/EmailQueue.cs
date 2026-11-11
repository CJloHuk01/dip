using System.Threading.Channels;

namespace WaterFix.API.Services;

public record NewComplaintEmailJob(
    string AdminEmail,
    string AdminName,
    string ComplaintId,
    string MachineAddress,
    string ComplaintType,
    string ComplaintTypeLabel,
    string Comment,
    string ContactType,
    string ContactValue,
    string? ReporterName,
    int MediaCount);

/// <summary>
/// Очередь писем, чтобы отправка не зависела от времени жизни HTTP-запроса.
/// </summary>
public class EmailQueue
{
    private readonly Channel<NewComplaintEmailJob> _queue =
        Channel.CreateUnbounded<NewComplaintEmailJob>(new UnboundedChannelOptions
        {
            SingleReader = true
        });

    public void Enqueue(NewComplaintEmailJob job) => _queue.Writer.TryWrite(job);

    public IAsyncEnumerable<NewComplaintEmailJob> ReadAllAsync(CancellationToken cancellationToken) =>
        _queue.Reader.ReadAllAsync(cancellationToken);
}
