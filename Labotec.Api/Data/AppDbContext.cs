
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public DbSet<Patient> Patients => Set<Patient>();

    // ✅ Disponibilidad por día/hora (lo que usa /api/appointments/availability)
    public DbSet<AppointmentAvailability> AppointmentAvailabilities => Set<AppointmentAvailability>();

    // (Si ya lo tienes en tu proyecto, déjalo. Si no lo usas, no molesta.)
    public DbSet<AvailabilitySlot> AvailabilitySlots => Set<AvailabilitySlot>();

    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<LabTestReferenceRange> LabTestReferenceRanges => Set<LabTestReferenceRange>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<LabOrder> LabOrders => Set<LabOrder>();
    public DbSet<LabOrderItem> LabOrderItems => Set<LabOrderItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();

    public DbSet<SchedulingSettings> SchedulingSettings => Set<SchedulingSettings>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<SchedulingSettings>(entity =>
        {
            entity.ToTable("SchedulingSettings");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.MaxPatientsPerHour)
                .IsRequired()
                .HasDefaultValue(10);

            entity.Property(x => x.UpdatedAt)
                .IsRequired();

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_SchedulingSettings_MaxPatientsPerHour_Positive",
                    "MaxPatientsPerHour > 0"
                );
            });
        });

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

        // (Si ya existe en tu proyecto)
        builder.Entity<AvailabilitySlot>(entity =>
        {
            entity.ToTable("AvailabilitySlots");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.StartUtc).IsRequired();
            entity.Property(x => x.Capacity).IsRequired().HasDefaultValue(0);

            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedByUserId).HasMaxLength(255);

            entity.HasIndex(x => x.StartUtc).IsUnique();

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_AvailabilitySlots_Capacity_NonNegative",
                    "Capacity >= 0"
                );
            });
        });

        // ✅ NUEVO/CLAVE: AppointmentAvailability (arregla tu error de Builder)
        builder.Entity<AppointmentAvailability>(entity =>
        {
            entity.ToTable("AppointmentAvailabilities");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Day).HasMaxLength(10).IsRequired();  // "YYYY-MM-DD"
            entity.Property(x => x.Time).HasMaxLength(5).IsRequired();  // "HH:00"
            entity.Property(x => x.StartUtc).IsRequired();
            entity.Property(x => x.Slots).IsRequired().HasDefaultValue(0);

            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity.HasIndex(x => x.StartUtc).IsUnique();

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_AppointmentAvailabilities_Slots_NonNegative",
                    "Slots >= 0"
                );
            });
        });

        builder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");

            entity.Property(a => a.Type)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(a => a.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(a => a.Notes)
                .HasMaxLength(500);

            entity.Property(a => a.CheckedInByUserId).HasMaxLength(255);
            entity.Property(a => a.StartedByUserId).HasMaxLength(255);
            entity.Property(a => a.CompletedByUserId).HasMaxLength(255);
            entity.Property(a => a.CanceledByUserId).HasMaxLength(255);
            entity.Property(a => a.NoShowByUserId).HasMaxLength(255);

            entity.HasIndex(a => a.PatientId);
            entity.HasIndex(a => a.ScheduledAt);
            entity.HasIndex(a => a.Status);
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

            entity.Property(t => t.DefaultPrice)
                .HasPrecision(18, 2);

            entity.HasIndex(t => t.Code).IsUnique();
        });

        builder.Entity<LabTestReferenceRange>(entity =>
        {
            entity.Property(r => r.Sex).HasMaxLength(1);
            entity.Property(r => r.TextRange).HasMaxLength(160);
            entity.Property(r => r.Unit).HasMaxLength(40);
            entity.Property(r => r.Notes).HasMaxLength(500);

            entity.HasIndex(r => r.LabTestId);
            entity.HasIndex(r => new { r.LabTestId, r.Sex, r.AgeMinYears, r.AgeMaxYears });

            entity.HasOne(r => r.LabTest)
                .WithMany()
                .HasForeignKey(r => r.LabTestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LabResult>(entity =>
        {
            entity.Property(r => r.TestName)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(r => r.ResultValue)
                .IsRequired();

            entity.Property(r => r.Unit)
                .IsRequired();

            entity.Property(r => r.PdfUrl)
                .HasMaxLength(300);

            entity.HasIndex(r => r.PatientId);
        });

        builder.Entity<LabOrder>(entity =>
        {
            entity.Property(o => o.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(o => o.Notes)
                .HasMaxLength(500);

            entity.HasIndex(o => o.PatientId);
            entity.HasIndex(o => o.CreatedAt);
        });

        builder.Entity<LabOrderItem>(entity =>
        {
            entity.Property(i => i.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(i => i.Price)
                .HasPrecision(18, 2);

            entity.ToTable("LabOrderItems", tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("CK_LabOrderItems_Price_NonNegative", "Price >= 0");
            });

            entity.HasIndex(i => i.LabOrderId);
            entity.HasIndex(i => i.LabTestId);
        });

        builder.Entity<Invoice>(entity =>
        {
            entity.Property(i => i.Number)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(i => i.Amount)
                .HasPrecision(18, 2);

            entity.HasIndex(i => i.Number).IsUnique();
            entity.HasIndex(i => i.PatientId);
        });

        builder.Entity<InvoiceItem>(entity =>
        {
            entity.Property(i => i.Price)
                .HasPrecision(18, 2);

            entity.ToTable("InvoiceItems", tableBuilder =>
            {
                tableBuilder.HasCheckConstraint("CK_InvoiceItems_Price_NonNegative", "Price >= 0");
            });

            entity.HasIndex(i => i.InvoiceId);
            entity.HasIndex(i => i.LabTestId);
        });
    }
}
