using HrApp.DomainEntities.Models;
using HrApp.Service.Implementation;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class DevelopmentAdminEmployeeSeederTests
    {
        [Fact]
        public async Task MissingLinkedEmployee_IsCreatedOnlyOnce()
        {
            using var h = new TestHarness();
            var seeder = new DevelopmentAdminEmployeeSeeder(h.Employees);

            await seeder.EnsureLinkedEmployeeAsync("admin-id", "admin@example.com");
            await seeder.EnsureLinkedEmployeeAsync("admin-id", "admin@example.com");

            var employees = await h.Context.Employees.Where(e => e.ApplicationUserId == "admin-id").ToListAsync();
            var employee = Assert.Single(employees);
            Assert.False(employee.IsDeleted);
            Assert.False(employee.IsErased);
        }

        [Fact]
        public async Task ActiveLinkedEmployee_IsNotChanged()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Existing", "Admin");
            employee.ApplicationUserId = "admin-id";
            h.Context.SaveChanges();

            await new DevelopmentAdminEmployeeSeeder(h.Employees).EnsureLinkedEmployeeAsync("admin-id", "admin@example.com");

            Assert.Single(await h.Context.Employees.Where(e => e.ApplicationUserId == "admin-id").ToListAsync());
            Assert.Equal("Existing", employee.FirstName);
        }

        [Fact]
        public async Task RetiredLinkedEmployee_IsNotDuplicatedOrRestored()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Retired", "Admin");
            employee.ApplicationUserId = "admin-id";
            employee.IsDeleted = true;
            employee.DeletedAt = DateTime.UtcNow;
            h.Context.SaveChanges();

            await new DevelopmentAdminEmployeeSeeder(h.Employees).EnsureLinkedEmployeeAsync("admin-id", "admin@example.com");

            Assert.Single(await h.Context.Employees.Where(e => e.ApplicationUserId == "admin-id").ToListAsync());
            Assert.True(employee.IsDeleted);
            Assert.Equal("Retired", employee.FirstName);
        }

        [Fact]
        public async Task ErasedLinkedEmployee_IsNotDuplicatedOrRepopulated()
        {
            using var h = new TestHarness();
            var employee = new Employee
            {
                EmployeeID = Guid.NewGuid(),
                ApplicationUserId = "admin-id",
                FirstName = "Erased",
                LastName = "Employee",
                IsDeleted = true,
                IsErased = true,
                ErasedAt = DateTime.UtcNow,
                DeletedAt = DateTime.UtcNow
            };
            h.Context.Employees.Add(employee);
            h.Context.SaveChanges();

            await new DevelopmentAdminEmployeeSeeder(h.Employees).EnsureLinkedEmployeeAsync("admin-id", "admin@example.com");

            Assert.Single(await h.Context.Employees.Where(e => e.ApplicationUserId == "admin-id").ToListAsync());
            Assert.True(employee.IsErased);
            Assert.Equal("Erased", employee.FirstName);
            Assert.Null(employee.Email);
        }
    }
}
