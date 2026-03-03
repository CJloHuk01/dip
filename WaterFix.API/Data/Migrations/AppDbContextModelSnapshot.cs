using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using WaterFix.API.Data;

#nullable disable

namespace WaterFix.API.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            modelBuilder.Entity("WaterFix.API.Models.User", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
                b.Property<string>("Name").IsRequired().HasColumnType("text");
                b.Property<string>("Email").IsRequired().HasColumnType("text");
                b.Property<string>("Phone").HasColumnType("text");
                b.Property<string>("PasswordHash").IsRequired().HasColumnType("text");
                b.Property<string>("Role").IsRequired().HasDefaultValue("user").HasColumnType("text");
                b.Property<string>("AvatarUrl").HasColumnType("text");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("Email").IsUnique();
                b.ToTable("Users");
            });

            modelBuilder.Entity("WaterFix.API.Models.Machine", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
                b.Property<string>("Address").IsRequired().HasColumnType("text");
                b.Property<double>("Latitude").HasColumnType("double precision");
                b.Property<double>("Longitude").HasColumnType("double precision");
                b.Property<string>("Status").IsRequired().HasColumnType("text");
                b.Property<string>("PhotoUrl").HasColumnType("text");
                b.Property<string>("WorkingHours").IsRequired().HasColumnType("text");
                b.Property<string>("Phone").IsRequired().HasColumnType("text");
                b.Property<string[]>("PaymentMethods").IsRequired().HasColumnType("text[]");
                b.Property<string>("WaterPrice").IsRequired().HasColumnType("text");
                b.Property<DateTime>("LastMaintenance").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.ToTable("Machines");
            });

            modelBuilder.Entity("WaterFix.API.Models.Complaint", b =>
            {
                b.Property<Guid>("Id").ValueGeneratedOnAdd().HasColumnType("uuid");
                b.Property<Guid>("MachineId").HasColumnType("uuid");
                b.Property<Guid?>("UserId").HasColumnType("uuid");
                b.Property<string>("UserName").HasColumnType("text");
                b.Property<string>("UserPhone").HasColumnType("text");
                b.Property<string>("Type").IsRequired().HasColumnType("text");
                b.Property<string>("TypeLabel").IsRequired().HasColumnType("text");
                b.Property<string>("Comment").IsRequired().HasColumnType("text");
                b.Property<string>("PhotoUrl").HasColumnType("text");
                b.Property<string>("Status").IsRequired().HasColumnType("text");
                b.Property<string>("AdminComment").HasColumnType("text");
                b.Property<DateTime>("CreatedAt").HasColumnType("timestamp with time zone");
                b.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
                b.HasKey("Id");
                b.HasIndex("MachineId");
                b.HasIndex("UserId");
                b.ToTable("Complaints");
            });

            modelBuilder.Entity("WaterFix.API.Models.Complaint", b =>
            {
                b.HasOne("WaterFix.API.Models.Machine", "Machine")
                    .WithMany("Complaints")
                    .HasForeignKey("MachineId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
                b.HasOne("WaterFix.API.Models.User", "User")
                    .WithMany("Complaints")
                    .HasForeignKey("UserId")
                    .OnDelete(DeleteBehavior.SetNull);
                b.Navigation("Machine");
                b.Navigation("User");
            });

            modelBuilder.Entity("WaterFix.API.Models.Machine", b =>
            {
                b.Navigation("Complaints");
            });

            modelBuilder.Entity("WaterFix.API.Models.User", b =>
            {
                b.Navigation("Complaints");
            });
#pragma warning restore 612, 618
        }
    }
}
