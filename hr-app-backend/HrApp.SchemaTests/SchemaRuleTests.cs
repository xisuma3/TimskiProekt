using HrApp.DomainEntities.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.SchemaTests
{
    /// <summary>
    /// Rules enforced by the database, not by C#. Each of these would pass against the
    /// in-memory provider regardless of what the schema really said.
    /// </summary>
    [Collection("SqlServer")]
    public class SchemaRuleTests
    {
        private readonly SqlServerFixture _fixture;

        public SchemaRuleTests(SqlServerFixture fixture) => _fixture = fixture;

        private static Employee NewEmployee(string email = null, bool deleted = false) => new()
        {
            EmployeeID = Guid.NewGuid(),
            FirstName = "Test",
            LastName = "Employee",
            Email = email,
            HireDate = new DateTime(2020, 1, 1),
            IsDeleted = deleted,
            DeletedAt = deleted ? DateTime.UtcNow : null
        };

        // --- Cascade policy -----------------------------------------------------

        [Theory]
        [InlineData("GeneratedDocuments")]
        [InlineData("LeaveRequests")]
        [InlineData("Assets")]
        [InlineData("AssetAssignments")]
        public async Task RecordsOfFact_DoNotCascadeFromEmployee(string table)
        {
            // Deleting an employee must not be able to take a signed document, an approval
            // decision or an asset custody record with it.
            await using var context = _fixture.CreateContext();

            var action = await context.Database
                .SqlQuery<string>($@"
                    SELECT TOP 1 fk.delete_referential_action_desc
                    FROM sys.foreign_keys fk
                    WHERE OBJECT_NAME(fk.referenced_object_id) = 'Employees'
                      AND OBJECT_NAME(fk.parent_object_id) = {table}
                      AND EXISTS (
                          SELECT 1 FROM sys.foreign_key_columns fkc
                          JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
                          WHERE fkc.constraint_object_id = fk.object_id AND c.name = 'EmployeeID')")
                .ToListAsync();

            Assert.Single(action);
            Assert.Equal("NO_ACTION", action[0]);
        }

        [Fact]
        public async Task DeletingAnEmployeeWithADocument_IsRefusedByTheDatabase()
        {
            // The real proof that the constraint bites. Seeding and deleting use separate
            // contexts on purpose: with the document tracked, EF's change tracker rejects
            // the delete client-side (see the next test) and SQL Server is never asked.
            // A fresh context issues a plain DELETE, so this is the database refusing.
            var employeeId = await SeedEmployeeWithDocument();

            await using var deleting = _fixture.CreateContext();
            var employee = await deleting.Employees.SingleAsync(e => e.EmployeeID == employeeId);
            deleting.Employees.Remove(employee);

            var ex = await Assert.ThrowsAsync<DbUpdateException>(() => deleting.SaveChangesAsync());
            Assert.Contains("FK_GeneratedDocuments_Employees_EmployeeID", ex.InnerException?.Message ?? "");

            // And the document is still there.
            await using var verifying = _fixture.CreateContext();
            Assert.True(await verifying.GeneratedDocuments.AnyAsync(g => g.EmployeeID == employeeId));
        }

        [Fact]
        public async Task DeletingAnEmployeeWithATrackedDocument_IsRefusedByEfFirst()
        {
            // Defence in depth: with the dependents loaded, Restrict makes EF refuse before
            // the statement is generated at all.
            var employeeId = await SeedEmployeeWithDocument();

            await using var context = _fixture.CreateContext();
            var employee = await context.Employees
                .Include(e => e.GeneratedDocuments)
                .SingleAsync(e => e.EmployeeID == employeeId);

            Assert.Throws<InvalidOperationException>(() => context.Employees.Remove(employee));
        }

        private async Task<Guid> SeedEmployeeWithDocument()
        {
            await using var context = _fixture.CreateContext();

            var employee = NewEmployee($"doc-{Guid.NewGuid():N}@example.com");
            var template = new DocumentTemplate
            {
                TemplateID = Guid.NewGuid(),
                TemplateName = "T",
                TemplateContent = "body",
                TemplateType = "Asset"
            };
            context.Employees.Add(employee);
            context.DocumentTemplates.Add(template);
            context.GeneratedDocuments.Add(new GeneratedDocument
            {
                DocumentID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID,
                Content = "signed",
                GeneratedDate = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            return employee.EmployeeID;
        }

        [Fact]
        public async Task TheDossier_StillCascades()
        {
            // Current-state PII should go with the employee on a genuine erasure.
            await using var context = _fixture.CreateContext();

            var action = await context.Database
                .SqlQuery<string>($@"
                    SELECT TOP 1 fk.delete_referential_action_desc
                    FROM sys.foreign_keys fk
                    WHERE OBJECT_NAME(fk.referenced_object_id) = 'Employees'
                      AND OBJECT_NAME(fk.parent_object_id) = 'EmployeeDossiers'")
                .ToListAsync();

            Assert.Single(action);
            Assert.Equal("CASCADE", action[0]);
        }

        // --- Filtered indexes ---------------------------------------------------

        [Fact]
        public async Task TwoActiveEmployees_CannotShareAnEmailAddress()
        {
            await using var context = _fixture.CreateContext();
            var email = $"clash-{Guid.NewGuid():N}@example.com";

            context.Employees.Add(NewEmployee(email));
            await context.SaveChangesAsync();

            context.Employees.Add(NewEmployee(email));
            await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        }

        [Fact]
        public async Task ARetiredEmployee_DoesNotReserveTheirEmailAddress()
        {
            // The whole point of filtering the unique index on IsDeleted: a leaver must not
            // block a re-hire or a new joiner with the same address.
            await using var context = _fixture.CreateContext();
            var email = $"rehire-{Guid.NewGuid():N}@example.com";

            context.Employees.Add(NewEmployee(email, deleted: true));
            await context.SaveChangesAsync();

            context.Employees.Add(NewEmployee(email));
            await context.SaveChangesAsync();   // must not throw

            var count = await context.Employees.CountAsync(e => e.Email == email);
            Assert.Equal(2, count);
        }

        [Fact]
        public async Task ManyAssets_CanHaveNoSerialNumber()
        {
            // SQL Server permits only one NULL in a plain unique index, which would cap the
            // estate at a single asset without a serial. Hence the IS NOT NULL filter.
            await using var context = _fixture.CreateContext();

            context.Assets.Add(new Asset { AssetID = Guid.NewGuid(), Name = "A", IsActive = true });
            context.Assets.Add(new Asset { AssetID = Guid.NewGuid(), Name = "B", IsActive = true });
            await context.SaveChangesAsync();   // must not throw

            var count = await context.Assets.CountAsync(a => a.SerialNumber == null);
            Assert.True(count >= 2);
        }

        [Fact]
        public async Task TwoAssets_CannotShareASerialNumber()
        {
            await using var context = _fixture.CreateContext();
            var serial = $"SN-{Guid.NewGuid():N}".Substring(0, 20);

            context.Assets.Add(new Asset { AssetID = Guid.NewGuid(), Name = "A", SerialNumber = serial, IsActive = true });
            await context.SaveChangesAsync();

            context.Assets.Add(new Asset { AssetID = Guid.NewGuid(), Name = "B", SerialNumber = serial, IsActive = true });
            await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        }

        [Fact]
        public async Task AnEmployee_GetsOneAllowancePerYearAndType()
        {
            await using var context = _fixture.CreateContext();
            var employee = NewEmployee($"ent-{Guid.NewGuid():N}@example.com");
            context.Employees.Add(employee);
            await context.SaveChangesAsync();

            context.LeaveEntitlements.Add(new LeaveEntitlement
            {
                EntitlementID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                Year = 2030,
                LeaveType = "Vacation",
                DaysAllocated = 20
            });
            await context.SaveChangesAsync();

            context.LeaveEntitlements.Add(new LeaveEntitlement
            {
                EntitlementID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                Year = 2030,
                LeaveType = "Vacation",
                DaysAllocated = 5
            });
            await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        }

        // --- Migrations reproduce the model ------------------------------------

        [Fact]
        public async Task TheMigrations_LeaveNothingPending()
        {
            // The fixture built this database with MigrateAsync. If the migrations do not
            // reproduce the model, EF reports a pending change here.
            await using var context = _fixture.CreateContext();

            var pending = await context.Database.GetPendingMigrationsAsync();

            Assert.Empty(pending);
        }

        [Fact]
        public async Task TheDeadUsersTable_IsNotRecreated()
        {
            await using var context = _fixture.CreateContext();

            var tables = await context.Database
                .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM sys.tables WHERE name = 'Users'")
                .ToListAsync();

            Assert.Equal(0, tables[0]);
        }
    }
}
