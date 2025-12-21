using Labotec.Api.Common;
using Labotec.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System;
using System.Data;
using System.Data.Common;

namespace Labotec.Api.Data;

public static class Seed
{
    public static async Task Run(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();

        await EnsureCreatedByNameColumnAsync(db);

        var roles = new[] { "Admin", "Recepcion", "Facturacion", "Bioanalista", "Paciente" };

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

        var defaultLabTests = new List<LabTest>
        {
            new() { Code = "CBC", Name = "Hemograma completo", DefaultUnit = string.Empty, DefaultPrice = 15m, ReferenceValue = "Consultar rangos por analito" },
            new() { Code = "GLU", Name = "Glucosa en suero", DefaultUnit = "mg/dL", DefaultPrice = 8m, ReferenceValue = "70-99" },
            new() { Code = "HB1C", Name = "Hemoglobina glucosilada (HbA1c)", DefaultUnit = "%", DefaultPrice = 18m, ReferenceValue = "4.0-5.6" },
            new() { Code = "CHOL", Name = "Colesterol total", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = "<200" },
            new() { Code = "HDL", Name = "Colesterol HDL", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = ">=40" },
            new() { Code = "LDL", Name = "Colesterol LDL calculado", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = "<100" },
            new() { Code = "TRIG", Name = "Triglicéridos", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = "<150" },
            new() { Code = "TSH", Name = "Hormona estimulante de tiroides (TSH)", DefaultUnit = "µUI/mL", DefaultPrice = 20m, ReferenceValue = "0.4-4.0" },
            new() { Code = "FT4", Name = "Tiroxina libre (T4L)", DefaultUnit = "ng/dL", DefaultPrice = 20m, ReferenceValue = "0.8-1.8" },
            new() { Code = "CRP", Name = "Proteína C reactiva (PCR)", DefaultUnit = "mg/L", DefaultPrice = 12m, ReferenceValue = "<10" },
            new() { Code = "BUN", Name = "Nitrógeno ureico en sangre (BUN)", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "7-20" },
            new() { Code = "CREA", Name = "Creatinina sérica", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "0.6-1.3" },
            new() { Code = "UA", Name = "Ácido úrico", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "3.4-7.0" },
            new() { Code = "ALT", Name = "Transaminasa glutámico pirúvica (ALT)", DefaultUnit = "U/L", DefaultPrice = 11m, ReferenceValue = "10-40" },
            new() { Code = "AST", Name = "Transaminasa glutámico oxalacética (AST)", DefaultUnit = "U/L", DefaultPrice = 11m, ReferenceValue = "10-40" },
            new() { Code = "ALP", Name = "Fosfatasa alcalina (ALP)", DefaultUnit = "U/L", DefaultPrice = 11m, ReferenceValue = "44-147" },
            new() { Code = "GGT", Name = "Gamma glutamil transferasa (GGT)", DefaultUnit = "U/L", DefaultPrice = 11m, ReferenceValue = "9-48" },
            new() { Code = "BILT", Name = "Bilirrubina total", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = "0.3-1.2" },
            new() { Code = "BILD", Name = "Bilirrubina directa", DefaultUnit = "mg/dL", DefaultPrice = 10m, ReferenceValue = "0.0-0.3" },
            new() { Code = "PROT", Name = "Proteínas totales", DefaultUnit = "g/dL", DefaultPrice = 9m, ReferenceValue = "6.0-8.3" },
            new() { Code = "ALB", Name = "Albúmina sérica", DefaultUnit = "g/dL", DefaultPrice = 9m, ReferenceValue = "3.5-5.0" },
            new() { Code = "CA", Name = "Calcio sérico", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "8.5-10.5" },
            new() { Code = "NA", Name = "Sodio sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m, ReferenceValue = "136-145" },
            new() { Code = "K", Name = "Potasio sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m, ReferenceValue = "3.5-5.1" },
            new() { Code = "CL", Name = "Cloro sérico", DefaultUnit = "mmol/L", DefaultPrice = 9m, ReferenceValue = "98-107" },
            new() { Code = "MG", Name = "Magnesio sérico", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "1.7-2.2" },
            new() { Code = "PHOS", Name = "Fósforo", DefaultUnit = "mg/dL", DefaultPrice = 9m, ReferenceValue = "2.5-4.5" },
            new() { Code = "PT", Name = "Tiempo de protrombina (TP)", DefaultUnit = "segundos", DefaultPrice = 14m, ReferenceValue = "11-13.5" },
            new() { Code = "PTT", Name = "Tiempo de tromboplastina parcial (TTP)", DefaultUnit = "segundos", DefaultPrice = 14m, ReferenceValue = "25-35" },
            new() { Code = "URINA", Name = "Examen general de orina", DefaultUnit = string.Empty, DefaultPrice = 12m, ReferenceValue = "Ver reporte" },
            new() { Code = "HCG", Name = "Prueba de embarazo (hCG)", DefaultUnit = "mUI/mL", DefaultPrice = 15m, ReferenceValue = "<5" },
            new() { Code = "HIV", Name = "VIH 1/2 (ELISA/QUIMIOLUMINISCENCIA)", DefaultUnit = string.Empty, DefaultPrice = 25m, ReferenceValue = "No reactivo" },
            new() { Code = "COVID", Name = "SARS-CoV-2 RT-PCR", DefaultUnit = string.Empty, DefaultPrice = 50m, ReferenceValue = "No detectable" },
            new() { Code = "VDRL", Name = "VDRL (Sífilis)", DefaultUnit = string.Empty, DefaultPrice = 12m, ReferenceValue = "No reactivo" },
            new() { Code = "HEPA", Name = "Antígeno de superficie de Hepatitis B (HBsAg)", DefaultUnit = string.Empty, DefaultPrice = 18m, ReferenceValue = "No reactivo" },
            new() { Code = "HEPC", Name = "Anticuerpos Hepatitis C (Anti-HCV)", DefaultUnit = string.Empty, DefaultPrice = 18m, ReferenceValue = "No reactivo" },
            new() { Code = "PSA", Name = "Antígeno prostático específico total (PSA)", DefaultUnit = "ng/mL", DefaultPrice = 22m, ReferenceValue = "<4.0" },
            new() { Code = "VITD", Name = "Vitamina D 25-OH", DefaultUnit = "ng/mL", DefaultPrice = 28m, ReferenceValue = "30-100" },
            new() { Code = "IRON", Name = "Hierro sérico", DefaultUnit = "µg/dL", DefaultPrice = 12m, ReferenceValue = "50-170" },
            new() { Code = "FERR", Name = "Ferritina sérica", DefaultUnit = "ng/mL", DefaultPrice = 18m, ReferenceValue = "30-400" },
            new() { Code = "B12", Name = "Vitamina B12", DefaultUnit = "pg/mL", DefaultPrice = 20m, ReferenceValue = "200-900" },
            new() { Code = "FOL", Name = "Ácido fólico", DefaultUnit = "ng/mL", DefaultPrice = 20m, ReferenceValue = "3-17" },
            new() { Code = "ESR", Name = "Velocidad de sedimentación globular (VSG)", DefaultUnit = "mm/h", DefaultPrice = 10m, ReferenceValue = "0-20" }
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
    }

    private static async Task EnsureCreatedByNameColumnAsync(AppDbContext db)
    {
        var connection = db.Database.GetDbConnection();
        var wasOpen = connection.State == ConnectionState.Open;

        if (!wasOpen)
        {
            await connection.OpenAsync();
        }

        await using var checkCmd = connection.CreateCommand();
        checkCmd.CommandText = @"SELECT COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'LabResults'
  AND COLUMN_NAME = 'CreatedByName';";

        var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;
        if (exists)
        {
            if (!wasOpen)
            {
                await connection.CloseAsync();
            }

            return;
        }

        await using var alterCmd = connection.CreateCommand();
        alterCmd.CommandText = "ALTER TABLE `LabResults` ADD COLUMN `CreatedByName` varchar(160) NOT NULL DEFAULT '' AFTER `Unit`;";
        await alterCmd.ExecuteNonQueryAsync();

        if (!wasOpen)
        {
            await connection.CloseAsync();
        }
    }
}
