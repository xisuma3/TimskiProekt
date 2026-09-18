// Program.cs

// Add these using statements at the top (if not already there)
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HrApp.Repository.Implementation;
using HrApp.Repository.Interface;
using HrApp.Service.Implementation;
using HrApp.Service.Interface;
using HrAppWebApplication;
using HrApp.DomainEntities.Identity;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer; // NEW!
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens; // NEW!
using System.Text;
using Microsoft.OpenApi.Models; // NEW!
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
var jwtSettings = JwtSettings.Create(builder.Configuration["Jwt:Key"], builder.Configuration["Jwt:Issuer"], builder.Configuration["Jwt:Audience"], builder.Configuration["Jwt:DurationInMinutes"]);

// --- Services Configuration ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
                       throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<HrAppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<HrAppDbContext>()
.AddDefaultTokenProviders();

// --- JWT Authentication Configuration (NEW SECTION) ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var applicationUserId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var accountStatusValidator = context.HttpContext.RequestServices
                .GetRequiredService<IEmployeeAccountStatusValidator>();

            if (!await accountStatusValidator.CanAuthenticateAsync(applicationUserId))
            {
                context.Fail("Invalid account status.");
            }
        }
    };
});
// --- End JWT Authentication Configuration ---

// Deny by default. Without this, an action with no [Authorize] attribute is fully
// public, which is how the whole API ended up anonymous. Endpoints that must stay
// open (login, register) opt out explicitly with [AllowAnonymous].
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});


// --- Existing Service Registrations ---
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();

builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IEmployeeAccountStatusValidator, EmployeeAccountStatusValidator>();
builder.Services.AddSingleton(jwtSettings);

builder.Services.AddScoped<IEmployeeDossierRepository, EmployeeDossierRepository>();
builder.Services.AddScoped<IEmployeeDossierService, EmployeeDossierService>();

builder.Services.AddScoped<IAssetRepository, AssetRepository>();
builder.Services.AddScoped<IAssetService, AssetService>();

builder.Services.AddScoped<IAssetAssignmentRepository, AssetAssignmentRepository>();

builder.Services.AddScoped<ILeaveEntitlementRepository, LeaveEntitlementRepository>();
builder.Services.AddScoped<ILeaveEntitlementService, LeaveEntitlementService>();

builder.Services.AddScoped<ILeaveRequestRepository, LeaveRequestRepository>();
builder.Services.AddScoped<ILeaveRequestService, LeaveRequestService>();

builder.Services.AddScoped<IDocumentTemplateRepository, DocumentTemplateRepository>();
builder.Services.AddSingleton<ITemplateHtmlSanitizer, TemplateHtmlSanitizer>();
builder.Services.AddScoped<IDocumentTemplateService, DocumentTemplateService>();

builder.Services.AddScoped<IGeneratedDocumentRepository, GeneratedDocumentRepository>();
builder.Services.AddScoped<IGeneratedDocumentService, GeneratedDocumentService>();

builder.Services.AddScoped<ITemplateProcessingService, TemplateProcessingService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "HrApp API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter into field the word 'Bearer' followed by a space and then the JWT",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
    {
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        new string[] { }
    }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:3000")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                      });
});



var app = builder.Build();

// --- 2. HTTP Request Pipeline Configuration ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Seeding a well-known admin password is a development convenience, not something
// that should ever run in a deployed environment.
var seedDevAdmin = app.Environment.IsDevelopment();

app.UseHttpsRedirection();

app.UseCors(MyAllowSpecificOrigins);

app.UseRouting();

// Ensure UseAuthentication is BEFORE UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    // Create "Employee" role if it doesn't exist
    if (!await roleManager.RoleExistsAsync("Employee"))
    {
        await roleManager.CreateAsync(new IdentityRole("Employee"));
    }

    // Optional: Create "Admin" role if you plan to use it (and assign it in your register logic or separately)
    if (!await roleManager.RoleExistsAsync("Admin"))
    {
        await roleManager.CreateAsync(new IdentityRole("Admin"));
    }

    if (seedDevAdmin)
    {
        var adminUser = await userManager.FindByEmailAsync("admin@example.com");
        if (adminUser == null)
        {
            adminUser = new ApplicationUser { UserName = "admin@example.com", Email = "admin@example.com", EmailConfirmed = true };
            var createAdminResult = await userManager.CreateAsync(adminUser, "AdminP@ss123!");
            if (createAdminResult.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
                await userManager.AddToRoleAsync(adminUser, "Employee");
            }
            else
            {
                adminUser = null;
            }
        }

        // An approver has to be a person in the org chart, not just a login: decisions are
        // recorded against an Employee. Without this the admin can approve leave but the
        // approval cannot be attributed to anyone.
        if (adminUser != null)
        {
            var employeeRepository = scope.ServiceProvider.GetRequiredService<IEmployeeRepository>();
            var employeeSeeder = new DevelopmentAdminEmployeeSeeder(employeeRepository);
            await employeeSeeder.EnsureLinkedEmployeeAsync(adminUser.Id, adminUser.Email);
        }
    }
}

app.Run();
