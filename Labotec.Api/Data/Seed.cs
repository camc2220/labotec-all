
using Labotec.Api.Common;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Data;

public static class Seed
{
    public static async Task Run(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

        var roles = new[] { "Admin", "Recepcion", "Facturacion", "Paciente" };

        foreach (var r in roles)
        {
            if (!await roleMgr.RoleExistsAsync(r))
            {
                var roleResult = await roleMgr.CreateAsync(new IdentityRole(r));
                if (!roleResult.Succeeded)
                {
                    throw new Exception($"Error creando rol '{r}': " +
                        string.Join(" | ", roleResult.Errors.Select(e => e.Description)));
                }
            }
        }

        var admin = await userMgr.FindByNameAsync("admin");
        if (admin is null)
        {
            admin = new IdentityUser
            {
                UserName = "admin",
                Email = "admin@labotec.local"
            };

            var createResult = await userMgr.CreateAsync(admin, PasswordDefaults.GenericPassword);
            if (!createResult.Succeeded)
            {
                throw new Exception("Error creando usuario admin: " +
                    string.Join(" | ", createResult.Errors.Select(e => e.Description)));
            }

            var addRoleResult = await userMgr.AddToRoleAsync(admin, "Admin");
            if (!addRoleResult.Succeeded)
            {
                throw new Exception("Error asignando rol Admin al usuario admin: " +
                    string.Join(" | ", addRoleResult.Errors.Select(e => e.Description)));
            }
        }

        // ✅ NUEVO: settings de agenda (punto 2)
        var sched = await db.SchedulingSettings.FirstOrDefaultAsync(s => s.Id == 1);
        if (sched is null)
        {
            db.SchedulingSettings.Add(new SchedulingSettings
            {
                Id = 1,
                MaxPatientsPerHour = 10,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else if (sched.MaxPatientsPerHour <= 0)
        {
            sched.MaxPatientsPerHour = 10;
            sched.UpdatedAt = DateTime.UtcNow;
        }

        var defaultLabTests = new List<LabTest>
        {
            new() { Code = "CBC", Name = "Hemograma completo", DefaultUnit = string.Empty, DefaultPrice = 15m },
            new() { Code = "GLU", Name = "Glucosa en suero", DefaultUnit = "mg/dL", DefaultPrice = 8m },
            new() { Code = "HB1C", Name = "Hemoglobina glucosilada (HbA1c)", DefaultUnit = "%", DefaultPrice = 18m },
            new() { Code = "CHOL", Name = "Colesterol total", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "HDL", Name = "Colesterol HDL", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "LDL", Name = "Colesterol LDL calculado", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "TRIG", Name = "Triglicéridos", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "TSH", Name = "Hormona estimulante de tiroides (TSH)", DefaultUnit = "µUI/mL", DefaultPrice = 20m },
            new() { Code = "FT4", Name = "Tiroxina libre (T4L)", DefaultUnit = "ng/dL", DefaultPrice = 20m },
            new() { Code = "CRP", Name = "Proteína C reactiva (PCR)", DefaultUnit = "mg/L", DefaultPrice = 12m },
            new() { Code = "BUN", Name = "Nitrógeno ureico en sangre (BUN)", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "CREA", Name = "Creatinina sérica", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "UA", Name = "Ácido úrico", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "ALT", Name = "Transaminasa glutámico pirúvica (ALT)", DefaultUnit = "U/L", DefaultPrice = 11m },
            new() { Code = "AST", Name = "Transaminasa glutámico oxalacética (AST)", DefaultUnit = "U/L", DefaultPrice = 11m },
            new() { Code = "ALP", Name = "Fosfatasa alcalina (ALP)", DefaultUnit = "U/L", DefaultPrice = 11m },
            new() { Code = "GGT", Name = "Gamma glutamil transferasa (GGT)", DefaultUnit = "U/L", DefaultPrice = 11m },
            new() { Code = "BILT", Name = "Bilirrubina total", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "BILD", Name = "Bilirrubina directa", DefaultUnit = "mg/dL", DefaultPrice = 10m },
            new() { Code = "PROT", Name = "Proteínas totales", DefaultUnit = "g/dL", DefaultPrice = 9m },
            new() { Code = "ALB", Name = "Albúmina sérica", DefaultUnit = "g/dL", DefaultPrice = 9m },
            new() { Code = "CA", Name = "Calcio sérico", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "NA", Name = "Sodio sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m },
            new() { Code = "K", Name = "Potasio sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m },
            new() { Code = "CL", Name = "Cloro sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m },
            new() { Code = "MG", Name = "Magnesio sérico", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "PHOS", Name = "Fósforo", DefaultUnit = "mg/dL", DefaultPrice = 9m },
            new() { Code = "PT", Name = "Tiempo de protrombina (TP)", DefaultUnit = "segundos", DefaultPrice = 14m },
            new() { Code = "PTT", Name = "Tiempo de tromboplastina parcial (TTP)", DefaultUnit = "segundos", DefaultPrice = 14m },
            new() { Code = "URINA", Name = "Examen general de orina", DefaultUnit = string.Empty, DefaultPrice = 12m },
            new() { Code = "HCG", Name = "Prueba de embarazo (hCG)", DefaultUnit = "mUI/mL", DefaultPrice = 15m },
            new() { Code = "HIV", Name = "VIH 1/2 (ELISA/QUIMIOLUMINISCENCIA)", DefaultUnit = string.Empty, DefaultPrice = 25m },
            new() { Code = "COVID", Name = "SARS-CoV-2 RT-PCR", DefaultUnit = string.Empty, DefaultPrice = 50m },
            new() { Code = "VDRL", Name = "VDRL (Sífilis)", DefaultUnit = string.Empty, DefaultPrice = 12m },
            new() { Code = "HEPA", Name = "Antígeno de superficie de Hepatitis B (HBsAg)", DefaultUnit = string.Empty, DefaultPrice = 18m },
            new() { Code = "HEPC", Name = "Anticuerpos Hepatitis C (Anti-HCV)", DefaultUnit = string.Empty, DefaultPrice = 18m },
            new() { Code = "PSA", Name = "Antígeno prostático específico total (PSA)", DefaultUnit = "ng/mL", DefaultPrice = 22m },
            new() { Code = "VITD", Name = "Vitamina D 25-OH", DefaultUnit = "ng/mL", DefaultPrice = 28m },
            new() { Code = "IRON", Name = "Hierro sérico", DefaultUnit = "µg/dL", DefaultPrice = 12m },
            new() { Code = "FERR", Name = "Ferritina sérica", DefaultUnit = "ng/mL", DefaultPrice = 18m },
            new() { Code = "B12", Name = "Vitamina B12", DefaultUnit = "pg/mL", DefaultPrice = 20m },
            new() { Code = "FOL", Name = "Ácido fólico", DefaultUnit = "ng/mL", DefaultPrice = 20m },
            new() { Code = "ESR", Name = "Velocidad de sedimentación globular (VSG)", DefaultUnit = "mm/h", DefaultPrice = 10m }
        };

        foreach (var test in defaultLabTests)
        {
            var exists = await db.LabTests.AnyAsync(t => t.Code == test.Code);
            if (!exists)
            {
                db.LabTests.Add(test);
            }
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }

        var referenceTexts = new Dictionary<string, string>
        {
            ["ALB"] = "3.5 - 5.0 g/dL",
            ["ALP"] = "40 - 130 U/L",
            ["ALT"] = "Hombres 10-55 U/L; Mujeres 7-45 U/L",
            ["AST"] = "Hombres 10-40 U/L; Mujeres 9-32 U/L",
            ["B12"] = "200 - 900 pg/mL",
            ["BILD"] = "0.0 - 0.3 mg/dL",
            ["BILT"] = "0.2 - 1.2 mg/dL",
            ["BUN"] = "7 - 20 mg/dL",
            ["CA"] = "8.5 - 10.5 mg/dL",
            ["CBC"] = "Interpretar por parámetro (Hb, Hto, leucocitos, plaquetas, etc.)",
            ["CHOL"] = "< 200 mg/dL",
            ["CL"] = "98 - 107 mmol/L",
            ["COVID"] = "Negativo",
            ["CREA"] = "Hombres 0.74-1.35 mg/dL; Mujeres 0.59-1.04 mg/dL",
            ["CRP"] = "< 3.0 mg/L",
            ["ESR"] = "Hombres < 15 mm/h; Mujeres < 20 mm/h",
            ["FERR"] = "Hombres 24-336 ng/mL; Mujeres 11-307 ng/mL",
            ["FOL"] = "5.0 - 20.0 ng/mL",
            ["FT4"] = "0.8 - 1.8 ng/dL",
            ["GGT"] = "Hombres 8-61 U/L; Mujeres 5-36 U/L",
            ["GLU"] = "70 - 99 mg/dL (ayunas)",
            ["HB1C"] = "4.0 - 5.6 %",
            ["HCG"] = "No embarazada < 5 mUI/mL",
            ["HDL"] = "Hombres ≥ 40 mg/dL; Mujeres ≥ 50 mg/dL",
            ["HEPA"] = "No reactivo",
            ["HEPC"] = "No reactivo",
            ["HIV"] = "No reactivo",
            ["IRON"] = "Hombres 65-176 µg/dL; Mujeres 50-170 µg/dL",
            ["K"] = "3.5 - 5.1 mmol/L",
            ["LDL"] = "< 100 mg/dL",
            ["MG"] = "1.7 - 2.4 mg/dL",
            ["NA"] = "135 - 145 mmol/L",
            ["PHOS"] = "2.5 - 4.5 mg/dL",
            ["PROT"] = "6.0 - 8.0 g/dL",
            ["PSA"] = "< 4.0 ng/mL",
            ["PT"] = "INR 0.8 - 1.2 (si no anticoagulado)",
            ["PTT"] = "25 - 35 segundos",
            ["TRIG"] = "< 150 mg/dL",
            ["TSH"] = "0.4 - 4.0 µUI/mL",
            ["UA"] = "Hombres 3.4-7.0 mg/dL; Mujeres 2.4-6.0 mg/dL",
            ["URINA"] = "Sin proteínas, glucosa ni sangre; sedimento sin hallazgos patológicos",
            ["VDRL"] = "No reactivo",
            ["VITD"] = "30 - 100 ng/mL"
        };

        var labTestsWithMissingReferenceValue = (await db.LabTests
                .ToListAsync())
            .Where(t => referenceTexts.ContainsKey(t.Code) && string.IsNullOrWhiteSpace(t.ReferenceValue))
            .ToList();

        foreach (var test in labTestsWithMissingReferenceValue)
        {
            test.ReferenceValue = referenceTexts[test.Code];
        }

        var labTestsByCode = await db.LabTests
            .ToDictionaryAsync(t => t.Code, t => t.Id);

        var referenceRanges = new List<ReferenceRangeSpec>
        {
            new("ALB", MinValue: 3.5m, MaxValue: 5.0m, Unit: "g/dL"),
            new("ALP", MinValue: 40m, MaxValue: 130m, Unit: "U/L"),
            new("ALT", Sex: "M", MinValue: 10m, MaxValue: 55m, Unit: "U/L"),
            new("ALT", Sex: "F", MinValue: 7m, MaxValue: 45m, Unit: "U/L"),
            new("AST", Sex: "M", MinValue: 10m, MaxValue: 40m, Unit: "U/L"),
            new("AST", Sex: "F", MinValue: 9m, MaxValue: 32m, Unit: "U/L"),
            new("B12", MinValue: 200m, MaxValue: 900m, Unit: "pg/mL"),
            new("BILD", MinValue: 0m, MaxValue: 0.3m, Unit: "mg/dL"),
            new("BILT", MinValue: 0.2m, MaxValue: 1.2m, Unit: "mg/dL"),
            new("BUN", MinValue: 7m, MaxValue: 20m, Unit: "mg/dL"),
            new("CA", MinValue: 8.5m, MaxValue: 10.5m, Unit: "mg/dL"),
            new("CBC", TextRange: "Interpretar por parámetro (Hb, Hto, leucocitos, plaquetas, etc.)"),
            new("CHOL", MinValue: 0m, MaxValue: 200m, Unit: "mg/dL"),
            new("CL", MinValue: 98m, MaxValue: 107m, Unit: "mmol/L"),
            new("COVID", TextRange: "Negativo"),
            new("CREA", Sex: "M", MinValue: 0.74m, MaxValue: 1.35m, Unit: "mg/dL"),
            new("CREA", Sex: "F", MinValue: 0.59m, MaxValue: 1.04m, Unit: "mg/dL"),
            new("CRP", MinValue: 0m, MaxValue: 3m, Unit: "mg/L", Notes: "Valores más altos sugieren inflamación aguda."),
            new("ESR", Sex: "M", MinValue: 0m, MaxValue: 15m, Unit: "mm/h"),
            new("ESR", Sex: "F", MinValue: 0m, MaxValue: 20m, Unit: "mm/h"),
            new("FERR", Sex: "M", MinValue: 24m, MaxValue: 336m, Unit: "ng/mL"),
            new("FERR", Sex: "F", MinValue: 11m, MaxValue: 307m, Unit: "ng/mL"),
            new("FOL", MinValue: 5m, MaxValue: 20m, Unit: "ng/mL"),
            new("FT4", MinValue: 0.8m, MaxValue: 1.8m, Unit: "ng/dL"),
            new("GGT", Sex: "M", MinValue: 8m, MaxValue: 61m, Unit: "U/L"),
            new("GGT", Sex: "F", MinValue: 5m, MaxValue: 36m, Unit: "U/L"),
            new("GLU", MinValue: 70m, MaxValue: 99m, Unit: "mg/dL", Notes: "En ayunas."),
            new("HB1C", MinValue: 4m, MaxValue: 5.6m, Unit: "%"),
            new("HCG", TextRange: "No embarazada < 5 mUI/mL", Unit: "mUI/mL"),
            new("HDL", Sex: "M", MinValue: 40m, Unit: "mg/dL"),
            new("HDL", Sex: "F", MinValue: 50m, Unit: "mg/dL"),
            new("HEPA", TextRange: "No reactivo"),
            new("HEPC", TextRange: "No reactivo"),
            new("HIV", TextRange: "No reactivo"),
            new("IRON", Sex: "M", MinValue: 65m, MaxValue: 176m, Unit: "µg/dL"),
            new("IRON", Sex: "F", MinValue: 50m, MaxValue: 170m, Unit: "µg/dL"),
            new("K", MinValue: 3.5m, MaxValue: 5.1m, Unit: "mmol/L"),
            new("LDL", MinValue: 0m, MaxValue: 100m, Unit: "mg/dL"),
            new("MG", MinValue: 1.7m, MaxValue: 2.4m, Unit: "mg/dL"),
            new("NA", MinValue: 135m, MaxValue: 145m, Unit: "mmol/L"),
            new("PHOS", MinValue: 2.5m, MaxValue: 4.5m, Unit: "mg/dL"),
            new("PROT", MinValue: 6m, MaxValue: 8m, Unit: "g/dL"),
            new("PSA", MinValue: 0m, MaxValue: 4m, Unit: "ng/mL"),
            new("PT", TextRange: "INR 0.8 - 1.2 (si no anticoagulado)", Unit: "INR"),
            new("PTT", MinValue: 25m, MaxValue: 35m, Unit: "segundos"),
            new("TRIG", MinValue: 0m, MaxValue: 150m, Unit: "mg/dL"),
            new("TSH", MinValue: 0.4m, MaxValue: 4m, Unit: "µUI/mL"),
            new("UA", Sex: "M", MinValue: 3.4m, MaxValue: 7m, Unit: "mg/dL"),
            new("UA", Sex: "F", MinValue: 2.4m, MaxValue: 6m, Unit: "mg/dL"),
            new("URINA", TextRange: "Sin proteínas, glucosa ni sangre; sedimento sin hallazgos patológicos"),
            new("VDRL", TextRange: "No reactivo"),
            new("VITD", MinValue: 30m, MaxValue: 100m, Unit: "ng/mL")
        };

        var existingRanges = await db.LabTestReferenceRanges.AsNoTracking().ToListAsync();

        foreach (var spec in referenceRanges)
        {
            if (!labTestsByCode.TryGetValue(spec.Code, out var labTestId))
            {
                continue;
            }

            var exists = existingRanges.Any(r =>
                r.LabTestId == labTestId &&
                string.Equals(r.Sex, spec.Sex, StringComparison.OrdinalIgnoreCase) &&
                r.AgeMinYears == spec.AgeMinYears &&
                r.AgeMaxYears == spec.AgeMaxYears &&
                r.MinValue == spec.MinValue &&
                r.MaxValue == spec.MaxValue &&
                r.TextRange == spec.TextRange &&
                r.Unit == spec.Unit);

            if (exists) continue;

            db.LabTestReferenceRanges.Add(new LabTestReferenceRange
            {
                LabTestId = labTestId,
                Sex = string.IsNullOrWhiteSpace(spec.Sex) ? null : spec.Sex.ToUpperInvariant(),
                AgeMinYears = spec.AgeMinYears,
                AgeMaxYears = spec.AgeMaxYears,
                MinValue = spec.MinValue,
                MaxValue = spec.MaxValue,
                TextRange = spec.TextRange,
                Unit = spec.Unit,
                Notes = spec.Notes,
                Active = true
            });
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }
    }
}

file record ReferenceRangeSpec(
    string Code,
    string? Sex = null,
    int? AgeMinYears = null,
    int? AgeMaxYears = null,
    decimal? MinValue = null,
    decimal? MaxValue = null,
    string? TextRange = null,
    string? Unit = null,
    string? Notes = null);
