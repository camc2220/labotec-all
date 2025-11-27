using Labotec.Api.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Labotec.Api.Data;

public static class Seed
{
    public static async Task Run(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
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
    }
}
