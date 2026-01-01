using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Labotec.Api.Data;

public static class Seed
{
    public static async Task Run(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await ctx.Database.MigrateAsync();

        var roles = new[] { "Admin", "Recepcion", "Facturacion" };
        foreach (var r in roles)
            if (!await roleMgr.RoleExistsAsync(r))
                await roleMgr.CreateAsync(new IdentityRole(r));

        var admin = await userMgr.FindByNameAsync("admin");
        if (admin is null)
        {
            admin = new IdentityUser { UserName = "admin", Email = "admin@labotec.local" };
            await userMgr.CreateAsync(admin, "Admin#2025!");
            await userMgr.AddToRoleAsync(admin, "Admin");
        }
    }
}
