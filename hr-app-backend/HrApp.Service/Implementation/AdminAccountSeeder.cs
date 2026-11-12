using HrApp.DomainEntities.Identity;
using HrApp.Repository.Interface;
using Microsoft.AspNetCore.Identity;

namespace HrApp.Service.Implementation
{
    public enum BootstrapAdminOutcome
    {
        NotConfigured,
        AdminAlreadyExists,
        Created,
        PromotedExistingAccount
    }

    /// <summary>
    /// Startup account seeding. <c>AuthController.Register</c> is Admin-only, so a database
    /// with no admin is a database nobody can ever log in to. This is the only way the first
    /// one appears.
    /// </summary>
    public class AdminAccountSeeder
    {
        public const string AdminRole = "Admin";
        public const string EmployeeRole = "Employee";

        // The password is committed to this repository, so this account must only ever
        // exist in Development.
        public const string DevelopmentAdminEmail = "admin@example.com";
        public const string DevelopmentAdminPassword = "AdminP@ss123!";

        private readonly UserManager<ApplicationUser> _users;
        private readonly RoleManager<IdentityRole> _roles;
        private readonly AdminEmployeeSeeder _employeeSeeder;

        public AdminAccountSeeder(UserManager<ApplicationUser> users, RoleManager<IdentityRole> roles, IEmployeeRepository employees)
        {
            _users = users;
            _roles = roles;
            _employeeSeeder = new AdminEmployeeSeeder(employees);
        }

        public async Task EnsureRolesAsync()
        {
            foreach (var role in new[] { EmployeeRole, AdminRole })
            {
                if (!await _roles.RoleExistsAsync(role))
                {
                    await _roles.CreateAsync(new IdentityRole(role));
                }
            }
        }

        /// <summary>
        /// The well-known local admin. Created once and never reset, so a password changed
        /// locally survives a restart.
        /// </summary>
        public async Task SeedDevelopmentAdminAsync()
        {
            var admin = await _users.FindByEmailAsync(DevelopmentAdminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser { UserName = DevelopmentAdminEmail, Email = DevelopmentAdminEmail, EmailConfirmed = true };
                var created = await _users.CreateAsync(admin, DevelopmentAdminPassword);
                if (!created.Succeeded) return;

                await _users.AddToRoleAsync(admin, AdminRole);
                await _users.AddToRoleAsync(admin, EmployeeRole);
            }

            // An approver has to be a person in the org chart, not just a login: decisions
            // are recorded against an Employee.
            await _employeeSeeder.EnsureLinkedEmployeeAsync(admin.Id, admin.Email);
        }

        /// <summary>
        /// The first admin of a deployed database, from configuration. Acts only while
        /// <b>nobody</b> holds the Admin role. Once an admin exists this is a no-op, so the
        /// settings can stay in place without ever resetting anyone's password or letting a
        /// config change mint a second admin.
        /// </summary>
        public async Task<BootstrapAdminOutcome> BootstrapAdminAsync(string? email, string? password)
        {
            if (string.IsNullOrWhiteSpace(email)) return BootstrapAdminOutcome.NotConfigured;

            if ((await _users.GetUsersInRoleAsync(AdminRole)).Count > 0)
            {
                return BootstrapAdminOutcome.AdminAlreadyExists;
            }

            email = email.Trim();
            var outcome = BootstrapAdminOutcome.PromotedExistingAccount;
            var admin = await _users.FindByEmailAsync(email);
            if (admin == null)
            {
                // Asked for an admin and given no way to create one. Failing startup is
                // louder than a deployment that quietly has no way in.
                if (string.IsNullOrWhiteSpace(password))
                {
                    throw new InvalidOperationException(
                        "BootstrapAdmin:Email is set but BootstrapAdmin:Password is not, and no admin exists yet.");
                }

                admin = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
                ThrowIfFailed(await _users.CreateAsync(admin, password), "create the bootstrap admin");
                outcome = BootstrapAdminOutcome.Created;
            }

            foreach (var role in new[] { AdminRole, EmployeeRole })
            {
                if (!await _users.IsInRoleAsync(admin, role))
                {
                    ThrowIfFailed(await _users.AddToRoleAsync(admin, role), $"add the bootstrap admin to {role}");
                }
            }

            await _employeeSeeder.EnsureLinkedEmployeeAsync(admin.Id, admin.Email);
            return outcome;
        }

        private static void ThrowIfFailed(IdentityResult result, string action)
        {
            if (result.Succeeded) return;
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Could not {action}: {errors}");
        }
    }
}
