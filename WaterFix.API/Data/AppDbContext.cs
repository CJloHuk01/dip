using Microsoft.EntityFrameworkCore;
using WaterFix.API.Models;

namespace WaterFix.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Machine> Machines => Set<Machine>();
    public DbSet<Complaint> Complaints => Set<Complaint>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasDefaultValue("user");
        });

        // Machine
        modelBuilder.Entity<Machine>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.PaymentMethods)
                .HasColumnType("text[]");
        });

        // Complaint
        modelBuilder.Entity<Complaint>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.Machine)
                .WithMany(m => m.Complaints)
                .HasForeignKey(c => c.MachineId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.User)
                .WithMany(u => u.Complaints)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
