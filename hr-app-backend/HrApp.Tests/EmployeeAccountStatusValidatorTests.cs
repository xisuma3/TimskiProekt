using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class EmployeeAccountStatusValidatorTests
    {
        [Fact]
        public async Task ActiveLinkedEmployee_CanAuthenticateRegardlessOfRole()
        {
            using var h = new TestHarness();
            var admin = h.AddEmployee("Admin", "User");
            admin.ApplicationUserId = "admin-id";
            var employee = h.AddEmployee("Employee", "User");
            employee.ApplicationUserId = "employee-id";
            h.Context.SaveChanges();

            Assert.True(await h.AccountStatusValidator.CanAuthenticateAsync("admin-id"));
            Assert.True(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));
        }

        [Fact]
        public async Task RetiredEmployee_IsRejectedAndRestorationAllowsAuthenticationAgain()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            employee.ApplicationUserId = "employee-id";
            h.Context.SaveChanges();

            Assert.True(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));
            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            Assert.False(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));

            await h.EmployeeService.RestoreAsync(employee.EmployeeID);
            Assert.True(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));
        }

        [Fact]
        public async Task ErasedEmployee_IsRejectedAndRemainsErased()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            employee.ApplicationUserId = "employee-id";
            h.Context.SaveChanges();

            Assert.True(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));
            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            await h.EmployeeService.EraseAsync(employee.EmployeeID);

            Assert.False(await h.AccountStatusValidator.CanAuthenticateAsync("employee-id"));
            var erased = await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID);
            Assert.True(erased.IsErased);
            Assert.Null(erased.ApplicationUserId);
            Assert.Equal("Erased", erased.FirstName);
        }

        [Fact]
        public async Task MissingEmployeeLink_IsRejected()
        {
            using var h = new TestHarness();

            Assert.False(await h.AccountStatusValidator.CanAuthenticateAsync("missing-user-id"));
            Assert.False(await h.AccountStatusValidator.CanAuthenticateAsync(null));
        }
    }
}
