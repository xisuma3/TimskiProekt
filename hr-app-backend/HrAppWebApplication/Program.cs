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
using Microsoft.IdentityModel.Tokens; // NEW!
using System.Text;
using Microsoft.OpenApi.Models; // NEW!

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// --- Services Configuration ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
                       throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<HrAppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true;
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
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});
// --- End JWT Authentication Configuration ---


// --- Existing Service Registrations ---
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();

builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();

// Commented out as these classes are not properly implemented
// builder.Services.AddScoped<IUserRepository, UserRepository>();
// builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddScoped<IEmployeeDossierRepository, EmployeeDossierRepository>();
builder.Services.AddScoped<IEmployeeDossierService, EmployeeDossierService>();

builder.Services.AddScoped<IAssetRepository, AssetRepository>();
builder.Services.AddScoped<IAssetService, AssetService>();

builder.Services.AddScoped<ILeaveRequestRepository, LeaveRequestRepository>();
builder.Services.AddScoped<ILeaveRequestService, LeaveRequestService>();

builder.Services.AddScoped<IDocumentTemplateRepository, DocumentTemplateRepository>();
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

    // Optional: Create a default admin user for testing
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
    }
}

app.Run();
