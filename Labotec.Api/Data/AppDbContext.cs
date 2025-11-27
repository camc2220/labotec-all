using Labotec.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<LabOrderItem> LabOrderItems => Set<LabOrderItem>();
    public DbSet<LabTest> LabTests => Set<LabTest>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Patient>(entity =>
        {
            entity.Property(p => p.FullName)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(p => p.DocumentId)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(p => p.UserId)
                .HasMaxLength(255);

            entity.HasIndex(p => p.DocumentId).IsUnique();
            entity.HasIndex(p => p.UserId).IsUnique();
        });

        builder.Entity<Appointment>(entity =>
        {
            entity.Property(a => a.Type)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(a => a.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.HasIndex(a => a.ScheduledAt);
        });

        builder.Entity<Invoice>(entity =>
        {
            entity.Property(i => i.Number)
                .IsRequired()
                .HasMaxLength(40);

            entity.HasIndex(i => i.Number).IsUnique();
        });

        builder.Entity<LabResult>(entity =>
        {
            entity.Property(r => r.TestName)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(r => r.PdfUrl)
                .HasMaxLength(300);
        });

        builder.Entity<LabOrder>(entity =>
        {
            entity.Property(o => o.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(o => o.Notes)
                .HasMaxLength(500);

            entity.HasIndex(o => o.CreatedAt);
        });

        builder.Entity<LabOrderItem>(entity =>
        {
            entity.Property(i => i.Status)
                .IsRequired()
                .HasMaxLength(30);
        });

        builder.Entity<LabTest>(entity =>
        {
            entity.Property(t => t.Code)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(t => t.Name)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(t => t.DefaultUnit)
                .HasMaxLength(40);

            entity.HasIndex(t => t.Code).IsUnique();
        });
    }
}
