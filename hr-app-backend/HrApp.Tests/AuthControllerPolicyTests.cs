using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Identity;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Implementation;
using HrApp.Service.Implementation;
using HrApp.Service.Interface;
using HrAppWebApplication;
using HrAppWebApplication.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class AuthControllerPolicyTests
    {
        [Fact]
        public void RegisterEndpoint_RequiresAdminRole()
        {
            var method = typeof(AuthController).GetMethod(nameof(AuthController.Register));
            var authorization = Assert.Single(method!.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>());
            Assert.Equal("Admin", authorization.Roles);
        }

        [Fact]
        public async Task AnonymousRegisterRequest_IsUnauthorized()
        {
            using var server = CreateAuthorizationServer();
            var response = await server.CreateClient().PostAsync("/api/Auth/register", JsonContent());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task EmployeeRegisterRequest_IsForbidden()
        {
            using var server = CreateAuthorizationServer();
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/Auth/register") { Content = JsonContent() };
            request.Headers.Add("X-Test-Role", "Employee");

            var response = await server.CreateClient().SendAsync(request);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task AdminRegistration_CreatesOnlyEmployeeRoleAndLinkedEmployee()
        {
            using var h = new IdentityHarness(includeEmployeeRole: true);
            var result = await h.Controller.Register(h.Request("new@example.com"));

            Assert.IsType<OkObjectResult>(result);
            var user = await h.Users.FindByEmailAsync("new@example.com");
            Assert.NotNull(user);
            Assert.Equal(new[] { "Employee" }, await h.Users.GetRolesAsync(user!));
            Assert.NotNull(await h.Context.Employees.SingleOrDefaultAsync(e => e.ApplicationUserId == user!.Id));
        }

        [Fact]
        public async Task RoleAssignmentFailure_DeletesCreatedUser()
        {
            using var h = new IdentityHarness(includeEmployeeRole: false);
            var result = await h.Controller.Register(h.Request("role-failure@example.com"));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Null(await h.Users.FindByEmailAsync("role-failure@example.com"));
        }

        [Fact]
        public async Task EmployeeLinkFailure_DeletesCreatedUserAndLeavesNoEmployee()
        {
            using var h = new IdentityHarness(includeEmployeeRole: true);
            var controller = h.CreateController(new ThrowingEmployeeService());
            var existing = await h.CreateActiveUserAsync("existing@example.com", "Valid1!");

            var result = await controller.Register(h.Request("link-failure@example.com"));

            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Null(await h.Users.FindByEmailAsync("link-failure@example.com"));
            Assert.Empty(await h.Context.Employees.Where(e => e.Email == "link-failure@example.com").ToListAsync());
            Assert.NotNull(await h.Users.FindByIdAsync(existing.Id));
        }

        [Fact]
        public async Task FailedPasswordsLockAccountAndResponsesRemainGeneric()
        {
            using var h = new IdentityHarness(includeEmployeeRole: true);
            var user = await h.CreateActiveUserAsync("login@example.com", "Valid1!");

            for (var attempt = 0; attempt < 5; attempt++)
            {
                var response = await h.Controller.Login(new LoginRequestDto { Email = user.Email!, Password = "wrong" });
                Assert.Equal("Invalid credentials.", Message(response));
            }

            Assert.True((await h.Users.GetLockoutEndDateAsync(user)) > DateTimeOffset.UtcNow);
            Assert.Equal("Invalid credentials.", Message(await h.Controller.Login(new LoginRequestDto { Email = user.Email!, Password = "Valid1!" })));
            Assert.Equal("Invalid credentials.", Message(await h.Controller.Login(new LoginRequestDto { Email = "missing@example.com", Password = "wrong" })));
        }

        [Fact]
        public async Task SuccessfulLoginBeforeLockout_ResetsFailedAttemptCount()
        {
            using var h = new IdentityHarness(includeEmployeeRole: true);
            var user = await h.CreateActiveUserAsync("reset@example.com", "Valid1!");

            await h.Controller.Login(new LoginRequestDto { Email = user.Email!, Password = "wrong" });
            await h.Controller.Login(new LoginRequestDto { Email = user.Email!, Password = "wrong" });
            Assert.Equal(2, await h.Users.GetAccessFailedCountAsync(user));

            var response = await h.Controller.Login(new LoginRequestDto { Email = user.Email!, Password = "Valid1!" });
            Assert.IsType<OkObjectResult>(response);
            var reloaded = await h.Users.FindByIdAsync(user.Id);
            Assert.Equal(0, await h.Users.GetAccessFailedCountAsync(reloaded!));
            Assert.False(await h.Users.IsLockedOutAsync(reloaded!));
        }

        private static string Message(IActionResult result) => System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(((ObjectResult)result).Value)).RootElement.GetProperty("Message").GetString()!;
        private static StringContent JsonContent() => new("{}", Encoding.UTF8, "application/json");

        private static TestServer CreateAuthorizationServer()
        {
            return new TestServer(new WebHostBuilder()
                .UseEnvironment("Testing")
                .ConfigureServices(services =>
                {
                    services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { });
                    services.AddAuthorization();
                    services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseEndpoints(endpoints => endpoints.MapControllers());
                }));
        }

        private sealed class IdentityHarness : IDisposable
        {
            private readonly ServiceProvider _provider;
            public HrAppDbContext Context { get; }
            public UserManager<ApplicationUser> Users { get; }
            public AuthController Controller { get; }

            public IdentityHarness(bool includeEmployeeRole)
            {
                var services = new ServiceCollection();
                services.AddLogging();
                services.AddHttpContextAccessor();
                services.AddDbContext<HrAppDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
                services.AddIdentity<ApplicationUser, IdentityRole>(o =>
                {
                    o.SignIn.RequireConfirmedAccount = true;
                    o.Lockout.AllowedForNewUsers = true;
                    o.Lockout.MaxFailedAccessAttempts = 5;
                    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                }).AddEntityFrameworkStores<HrAppDbContext>().AddDefaultTokenProviders();
                _provider = services.BuildServiceProvider();
                Context = _provider.GetRequiredService<HrAppDbContext>();
                Users = _provider.GetRequiredService<UserManager<ApplicationUser>>();
                if (includeEmployeeRole) _provider.GetRequiredService<RoleManager<IdentityRole>>().CreateAsync(new IdentityRole("Employee")).GetAwaiter().GetResult();
                var employees = new EmployeeRepository(Context);
                Controller = new AuthController(Users, _provider.GetRequiredService<SignInManager<ApplicationUser>>(), JwtSettings.Create("01234567890123456789012345678901", "issuer", "audience", "60"), new EmployeeService(employees), new EmployeeAccountStatusValidator(employees));
            }
            public RegisterRequestDto Request(string email) => new() { Email = email, Password = "Valid1!", FirstName = "Ada", LastName = "Lovelace", Position = "Engineer", HireDate = DateTime.UtcNow };
            public AuthController CreateController(IEmployeeService employeeService) => new(Users, _provider.GetRequiredService<SignInManager<ApplicationUser>>(), JwtSettings.Create("01234567890123456789012345678901", "issuer", "audience", "60"), employeeService, new EmployeeAccountStatusValidator(new EmployeeRepository(Context)));
            public async Task<ApplicationUser> CreateActiveUserAsync(string email, string password)
            {
                var user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
                Assert.True((await Users.CreateAsync(user, password)).Succeeded);
                await Users.AddToRoleAsync(user, "Employee");
                Context.Employees.Add(new Employee { EmployeeID = Guid.NewGuid(), ApplicationUserId = user.Id, FirstName = "Ada", LastName = "Lovelace", Email = email, Position = "Engineer", HireDate = DateTime.UtcNow });
                await Context.SaveChangesAsync();
                return user;
            }
            public void Dispose() => _provider.Dispose();
        }

        private sealed class ThrowingEmployeeService : IEmployeeService
        {
            public Task<EmployeeResponseDto> AddAsync(EmployeeRequestDto dto) => throw new InvalidOperationException("Persistence failed");
            public Task DeleteAsync(Guid id) => throw new NotImplementedException();
            public Task EraseAsync(Guid id) => throw new NotImplementedException();
            public Task<IEnumerable<EmployeeResponseDto>> GetAllAsync() => throw new NotImplementedException();
            public Task<EmployeeResponseDto> GetByApplicationUserIdAsync(string applicationUserId) => throw new NotImplementedException();
            public Task<EmployeeResponseDto> GetByIdAsync(Guid id) => throw new NotImplementedException();
            public Task RestoreAsync(Guid id) => throw new NotImplementedException();
            public Task UpdateAsync(Guid id, UpdateEmployeeRequestDto dto) => throw new NotImplementedException();
        }

        private sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
        {
            public TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, Microsoft.Extensions.Logging.ILoggerFactory logger, System.Text.Encodings.Web.UrlEncoder encoder) : base(options, logger, encoder) { }
            protected override Task<AuthenticateResult> HandleAuthenticateAsync()
            {
                if (!Request.Headers.TryGetValue("X-Test-Role", out var role)) return Task.FromResult(AuthenticateResult.NoResult());
                var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "test-user"), new Claim(ClaimTypes.Role, role!) }, Scheme.Name);
                return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
            }
        }
    }
}
