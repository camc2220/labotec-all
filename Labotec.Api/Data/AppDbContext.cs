using Labotec.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Data;

public class AppDbContext : IdentityDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Patient>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FullName).HasMaxLength(160).IsRequired();
            e.Property(x => x.DocumentId).HasMaxLength(30).IsRequired();
            e.HasIndex(x => x.DocumentId).IsUnique();
        });

        b.Entity<Appointment>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Patient)
             .WithMany(x => x.Appointments)
             .HasForeignKey(x => x.PatientId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Type).HasMaxLength(120);
            e.Property(x => x.Status).HasMaxLength(30);
            e.HasIndex(x => x.ScheduledAt);
        });

        b.Entity<LabResult>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Patient)
             .WithMany(x => x.Results)
             .HasForeignKey(x => x.PatientId);
            e.Property(x => x.TestName).HasMaxLength(160).IsRequired();
            e.Property(x => x.PdfUrl).HasMaxLength(300);
        });

        b.Entity<Invoice>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Patient)
             .WithMany(x => x.Invoices)
             .HasForeignKey(x => x.PatientId);
            e.Property(x => x.Number).HasMaxLength(40).IsRequired();
            e.HasIndex(x => x.Number).IsUnique();
        });
    }
}
