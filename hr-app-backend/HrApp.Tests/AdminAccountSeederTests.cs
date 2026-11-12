using HrApp.DomainEntities.Identity;
using HrApp.Repository.Implementation;
using HrApp.Service.Implementation;
using HrAppWebApplication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class AdminAccountSeederTests
    {
        [Fact]
        public async Task Bootstrap_WithNoEmailConfigured_DoesNothing()
        {
            using var h = await SeederHarness.CreateAsync();

            Assert.Equal(BootstrapAdminOutcome.NotConfigured, await h.Seeder.BootstrapAdminAsync(null, "Secret1!"));
            Assert.Empty(h.Users.Users);
        }

        [Fact]
        public async Task Bootstrap_OnEmptyDatabase_CreatesAConfirmedAdminLinkedToAnEmployee()
        {
            using var h = await SeederHarness.CreateAsync();

            var outcome = await h.Seeder.BootstrapAdminAsync(" boss@hr.test ", "Secret1!");

            Assert.Equal(BootstrapAdminOutcome.Created, outcome);
            var admin = await h.Users.FindByEmailAsync("boss@hr.test");
            Assert.NotNull(admin);
            Assert.True(admin!.EmailConfirmed); // RequireConfirmedAccount would refuse the login otherwise
            Assert.True(await h.Users.CheckPasswordAsync(admin, "Secret1!"));
            Assert.True(await h.Users.IsInRoleAsync(admin, AdminAccountSeeder.AdminRole));
            Assert.True(await h.Users.IsInRoleAsync(admin, AdminAccountSeeder.EmployeeRole));
            Assert.Single(await h.Context.Employees.Where(e => e.ApplicationUserId == admin.Id).ToListAsync());
        }

        [Fact]
        public async Task Bootstrap_OnceAnAdminExists_NeitherResetsAPasswordNorMintsASecondAdmin()
        {
            using var h = await SeederHarness.CreateAsync();
            await h.Seeder.BootstrapAdminAsync("boss@hr.test", "Secret1!");

            // Same account, new password in the settings: must not become a password reset.
            Assert.Equal(BootstrapAdminOutcome.AdminAlreadyExists, await h.Seeder.BootstrapAdminAsync("boss@hr.test", "Changed1!"));
            // A different account in the settings: must not become a second admin.
            Assert.Equal(BootstrapAdminOutcome.AdminAlreadyExists, await h.Seeder.BootstrapAdminAsync("other@hr.test", "Other1!"));

            var admin = await h.Users.FindByEmailAsync("boss@hr.test");
            Assert.True(await h.Users.CheckPasswordAsync(admin!, "Secret1!"));
            Assert.Null(await h.Users.FindByEmailAsync("other@hr.test"));
            Assert.Single(await h.Users.GetUsersInRoleAsync(AdminAccountSeeder.AdminRole));
        }

        [Fact]
        public async Task Bootstrap_ForAnExistingAccount_PromotesItWithoutTouchingThePassword()
        {
            using var h = await SeederHarness.CreateAsync();
            var existing = new ApplicationUser { UserName = "lead@hr.test", Email = "lead@hr.test", EmailConfirmed = true };
            Assert.True((await h.Users.CreateAsync(existing, "Original1!")).Succeeded);

            var outcome = await h.Seeder.BootstrapAdminAsync("lead@hr.test", "Ignored1!");

            Assert.Equal(BootstrapAdminOutcome.PromotedExistingAccount, outcome);
            Assert.True(await h.Users.IsInRoleAsync(existing, AdminAccountSeeder.AdminRole));
            Assert.True(await h.Users.CheckPasswordAsync(existing, "Original1!"));
        }

        [Theory]
        [InlineData(null)]   // email with no password, and no account to promote
        [InlineData("123")]  // shorter than Identity's minimum length
        public async Task Bootstrap_ThatCannotCreateTheAdmin_FailsLoudlyAndLeavesNoAccount(string? password)
        {
            using var h = await SeederHarness.CreateAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() => h.Seeder.BootstrapAdminAsync("boss@hr.test", password));

            Assert.Null(await h.Users.FindByEmailAsync("boss@hr.test"));
        }

        [Fact]
        public async Task DevelopmentAdmin_IsCreatedOnce_AndSatisfiesBootstrap()
        {
            using var h = await SeederHarness.CreateAsync();

            await h.Seeder.SeedDevelopmentAdminAsync();
            await h.Seeder.SeedDevelopmentAdminAsync();

            var admin = await h.Users.FindByEmailAsync(AdminAccountSeeder.DevelopmentAdminEmail);
            Assert.True(await h.Users.IsInRoleAsync(admin!, AdminAccountSeeder.AdminRole));
            Assert.Single(await h.Context.Employees.Where(e => e.ApplicationUserId == admin!.Id).ToListAsync());
            // Locally the dev admin already exists, so a bootstrap setting changes nothing.
            Assert.Equal(BootstrapAdminOutcome.AdminAlreadyExists, await h.Seeder.BootstrapAdminAsync("boss@hr.test", "Secret1!"));
        }

        private sealed class SeederHarness : IDisposable
        {
            private readonly ServiceProvider _provider;
            public HrAppDbContext Context { get; }
            public UserManager<ApplicationUser> Users { get; }
            public AdminAccountSeeder Seeder { get; }

            private SeederHarness()
            {
                var services = new ServiceCollection();
                services.AddLogging();
                services.AddDbContext<HrAppDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
                // Same password rules as Program.cs, so "too short" means what it means there.
                services.AddIdentity<ApplicationUser, IdentityRole>(o =>
                {
                    o.SignIn.RequireConfirmedAccount = true;
                    o.Password.RequireDigit = false;
                    o.Password.RequiredLength = 6;
                    o.Password.RequireNonAlphanumeric = false;
                    o.Password.RequireUppercase = false;
                    o.Password.RequireLowercase = false;
                }).AddEntityFrameworkStores<HrAppDbContext>();
                _provider = services.BuildServiceProvider();

                Context = _provider.GetRequiredService<HrAppDbContext>();
                Users = _provider.GetRequiredService<UserManager<ApplicationUser>>();
                Seeder = new AdminAccountSeeder(Users, _provider.GetRequiredService<RoleManager<IdentityRole>>(), new EmployeeRepository(Context));
            }

            public static async Task<SeederHarness> CreateAsync()
            {
                var harness = new SeederHarness();
                await harness.Seeder.EnsureRolesAsync();
                return harness;
            }

            public void Dispose() => _provider.Dispose();
        }
    }
}
