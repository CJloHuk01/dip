using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using WaterFix.API.Data;
using WaterFix.API.Helpers;
using WaterFix.API.Models;
using WaterFix.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Большие видео (до 50 МБ) + запас на multipart
const long maxUploadBytes = 120L * 1024 * 1024;
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = maxUploadBytes);
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = maxUploadBytes);

// === Settings ===
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()!;
var fileSettings = builder.Configuration.GetSection("FileSettings").Get<FileSettings>()!;
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var emailSettings = builder.Configuration.GetSection("EmailSettings").Get<EmailSettings>()!;

// Проверяем обязательные секреты, чтобы приложение не стартовало с пустыми значениями
if (jwtSettings is null ||
    string.IsNullOrWhiteSpace(jwtSettings.Secret) ||
    Encoding.UTF8.GetByteCount(jwtSettings.Secret) < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret не задан или короче 32 байт. Укажите JWT_SECRET в переменных окружения " +
        "(или в appsettings.Development.json для локальной разработки).");
}

if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
{
    throw new InvalidOperationException(
        "Не задана строка подключения ConnectionStrings:DefaultConnection. " +
        "Укажите её в переменных окружения (или в appsettings.Development.json для локальной разработки).");
}

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton(fileSettings);
builder.Services.AddSingleton(emailSettings);

// === Database ===
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// === Services ===
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<FileService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddSingleton<EmailQueue>();
builder.Services.AddHostedService<EmailBackgroundService>();

// === JWT Auth ===
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) &&
                    context.Request.Cookies.TryGetValue(AuthConstants.AdminCookieName, out var cookieToken))
                {
                    context.Token = cookieToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// === CORS ===
builder.Services.AddCors(opt =>
    opt.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// === Rate Limiting ===
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string PartitionKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    opt.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    opt.AddPolicy("public-complaints", context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromHours(1),
            QueueLimit = 0
        }));

    opt.AddPolicy("public-read", context =>
        RateLimitPartition.GetFixedWindowLimiter(PartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

// === Proxy (Caddy) ===
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// === Controllers ===
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

if (string.IsNullOrWhiteSpace(emailSettings.SenderEmail) ||
    string.IsNullOrWhiteSpace(emailSettings.Password))
{
    app.Logger.LogWarning(
        "EmailSettings не настроены: уведомления на почту отправляться не будут. " +
        "Задайте EmailSettings__SenderEmail и EmailSettings__Password.");
}

// === Static Files (SPA + загруженные фото) ===
app.UseForwardedHeaders();
app.UseDefaultFiles();
app.UseStaticFiles();

// === Middleware ===
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Неизвестные /api/* должны возвращать 404, а не index.html
app.MapFallback("/api/{*path}", context =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    return Task.CompletedTask;
});

// Все остальные пути отдают SPA (React Router)
app.MapFallbackToFile("index.html");

// === Migrations + Seed ===
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, app.Configuration, app.Environment);
}

app.Run();
