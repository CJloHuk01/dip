using Microsoft.EntityFrameworkCore;
using WaterFix.API.Models;

namespace WaterFix.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Admin> Admins => Set<Admin>();
    public DbSet<Machine> Machines => Set<Machine>();
    public DbSet<Complaint> Complaints => Set<Complaint>();
    public DbSet<ComplaintMedia> ComplaintMedia => Set<ComplaintMedia>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Admin>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.Email).IsUnique();
        });

        modelBuilder.Entity<Machine>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => m.PublicCode).IsUnique();
            e.Property(m => m.PaymentMethods).HasColumnType("text[]");
        });

        modelBuilder.Entity<Complaint>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.Machine)
                .WithMany(m => m.Complaints)
                .HasForeignKey(c => c.MachineId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ComplaintMedia>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasOne(m => m.Complaint)
                .WithMany(c => c.Media)
                .HasForeignKey(m => m.ComplaintId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
