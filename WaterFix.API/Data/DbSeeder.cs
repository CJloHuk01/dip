using WaterFix.API.Models;

namespace WaterFix.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (context.Users.Any()) return;

        var adminId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var users = new List<User>
        {
            new()
            {
                Id = adminId,
                Name = "Администратор",
                Email = "admin@waterfix.ru",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = "admin",
                Phone = "+79001234567"
            },
            new()
            {
                Id = userId,
                Name = "Александр",
                Email = "sanya@mail.ru",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                Role = "user",
                Phone = "+79007654321"
            }
        };

        var machines = new List<Machine>
        {
            new()
            {
                Address = "г.Оренбург ул.Сергея Лазо 8",
                Latitude = 51.7608,
                Longitude = 55.0969,
                Status = "working",
                WorkingHours = "Круглосуточно",
                Phone = "+73532123456",
                PaymentMethods = new[] { "cash", "card" },
                WaterPrice = "5 руб/л",
                LastMaintenance = DateTime.UtcNow.AddDays(-10)
            },
            new()
            {
                Address = "г.Оренбург ул.Чкалова 24А",
                Latitude = 51.7752,
                Longitude = 55.1015,
                Status = "working",
                WorkingHours = "08:00-22:00",
                Phone = "+73532123456",
                PaymentMethods = new[] { "cash" },
                WaterPrice = "4 руб/л",
                LastMaintenance = DateTime.UtcNow.AddDays(-5)
            },
            new()
            {
                Address = "г.Оренбург ул.Пролетарская 288/2",
                Latitude = 51.7680,
                Longitude = 55.0830,
                Status = "maintenance",
                WorkingHours = "Круглосуточно",
                Phone = "+73532123456",
                PaymentMethods = new[] { "cash", "card", "qr" },
                WaterPrice = "5 руб/л",
                LastMaintenance = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Address = "г.Оренбург ул.Шевченко 225",
                Latitude = 51.7820,
                Longitude = 55.0920,
                Status = "problem",
                WorkingHours = "Круглосуточно",
                Phone = "+73532123456",
                PaymentMethods = new[] { "cash", "card" },
                WaterPrice = "5 руб/л",
                LastMaintenance = DateTime.UtcNow.AddDays(-30)
            }
        };

        await context.Users.AddRangeAsync(users);
        await context.Machines.AddRangeAsync(machines);
        await context.SaveChangesAsync();
    }
}
