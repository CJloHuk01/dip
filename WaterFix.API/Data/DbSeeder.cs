using Microsoft.EntityFrameworkCore;
using WaterFix.API.Helpers;
using WaterFix.API.Models;

namespace WaterFix.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration config, IHostEnvironment env)
    {
        await SeedAdminAsync(context, config, env);
        await EnsureMachineCodesAsync(context);
        await SeedDemoMachinesAsync(context, env);
    }

    private static async Task SeedAdminAsync(AppDbContext context, IConfiguration config, IHostEnvironment env)
    {
        if (await context.Admins.AnyAsync()) return;

        var email = config["Admin:Email"];
        var password = config["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            if (!env.IsDevelopment())
            {
                Console.WriteLine(
                    "ВНИМАНИЕ: администратор не создан. Задайте Admin__Email и Admin__Password " +
                    "(или ADMIN_EMAIL/ADMIN_PASSWORD в docker-compose).");
                return;
            }

            email = "payturkey123231@gmail.com";
            password = "WaterFix-2026!";
        }

        context.Admins.Add(new Admin
        {
            Name = "Администратор",
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureMachineCodesAsync(AppDbContext context)
    {
        var machines = await context.Machines
            .Where(m => m.PublicCode == null || m.PublicCode == "")
            .ToListAsync();

        if (machines.Count == 0) return;

        foreach (var machine in machines)
        {
            string code;
            do
            {
                code = PublicCodeGenerator.Generate();
            } while (await context.Machines.AnyAsync(m => m.PublicCode == code));

            machine.PublicCode = code;
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedDemoMachinesAsync(AppDbContext context, IHostEnvironment env)
    {
        if (!env.IsDevelopment() || await context.Machines.AnyAsync()) return;

        var machines = new List<Machine>
        {
            new()
            {
                PublicCode = PublicCodeGenerator.Generate(),
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
                PublicCode = PublicCodeGenerator.Generate(),
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
                PublicCode = PublicCodeGenerator.Generate(),
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
                PublicCode = PublicCodeGenerator.Generate(),
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

        context.Machines.AddRange(machines);
        await context.SaveChangesAsync();
    }
}
