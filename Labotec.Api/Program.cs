
using Labotec.Api.Auth;
using Labotec.Api.Data;
using Labotec.Api.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =======================
// SERILOG
// =======================
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// =======================
// CONTROLLERS
// =======================
builder.Services.AddControllers();

// Si luego tienes problemas de ciclos por includes, puedes activar esto:
// builder.Services.AddControllers().AddJsonOptions(o =>
// {
//     o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
// });

builder.Services.AddEndpointsApiExplorer();

// =======================
// SWAGGER + JWT
// =======================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Labotec API",
        Version = "v1"
    });

    // Bearer token en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega tu token así: Bearer {tu_token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// =======================
// DB CONTEXT (MySQL)
// =======================
var cs = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(cs, ServerVersion.AutoDetect(cs)));

// =======================
// IDENTITY
// =======================
builder.Services
    .AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// Evitar redirección HTML en API (401/403)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };

    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// =======================
// JWT
// =======================
builder.Services.AddScoped<JwtTokenService>();

var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtSettings>(jwtSection);

var key = Encoding.UTF8.GetBytes(jwtSection["Key"]!);

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT error: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine($"JWT OK para usuario: {context.Principal?.Identity?.Name}");
                return Task.CompletedTask;
            }
        };
    });

// =======================
// CORS (desde appsettings)
// =======================
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AppCors", p =>
    {
        p.AllowAnyHeader()
         .AllowAnyMethod();

        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "*" };

        if (origins.Any(x => x == "*"))
            p.AllowAnyOrigin();
        else
            p.WithOrigins(origins);
    });
});

// =======================
// STORAGE (File o Azure)
// =======================
builder.Services.AddScoped<IStorageService>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var provider = (cfg.GetValue<string>("Storage:Provider") ?? "File").Trim();

    if (provider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
    {
        return ActivatorUtilities.CreateInstance<AzureBlobService>(sp);
    }

    return ActivatorUtilities.CreateInstance<FileStorageService>(sp);
});

// (Opcional) límite global para multipart (por si subes PDFs grandes)
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 20_000_000; // 20 MB
});

// =======================
// BUILD APP
// =======================
var app = builder.Build();

app.UseSerilogRequestLogging();

// Swagger (yo lo dejo siempre; si quieres solo en Dev, lo metemos en if)
app.UseSwagger();
app.UseSwaggerUI();

// Servir archivos estáticos (para /wwwroot/uploads cuando Storage=File)
app.UseStaticFiles();

app.UseCors("AppCors");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// =======================
// MIGRATIONS + SEED
// =======================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Seed crea roles, admin, scheduling settings, lab tests, etc.
await Seed.Run(app.Services);

app.Run();
