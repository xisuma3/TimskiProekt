using HrApp.DomainEntities.Models;
using HrApp.Repository.Implementation;
using HrApp.Service.Implementation;
using HrAppWebApplication;
using Microsoft.EntityFrameworkCore;
using System;

namespace HrApp.Tests
{
    /// <summary>
    /// Wires a real DbContext (in-memory), real repositories and real services together,
    /// so tests exercise the actual query and mapping code rather than mocks.
    ///
    /// The in-memory provider does not enforce foreign keys, unique indexes or column
    /// types, so these tests cover *service behaviour*, not database constraints. Rules
    /// that live only in the schema (the filtered email index, Restrict cascades) are
    /// verified against SQL Server instead.
    ///
    /// Each harness gets its own database name, so tests are isolated and can run in
    /// parallel.
    /// </summary>
    public sealed class TestHarness : IDisposable
    {
        public HrAppDbContext Context { get; }

        public EmployeeRepository Employees { get; }
        public LeaveRequestRepository LeaveRequests { get; }
        public AssetRepository Assets { get; }
        public AssetAssignmentRepository AssetAssignments { get; }
        public LeaveEntitlementRepository Entitlements { get; }
        public DocumentTemplateRepository Templates { get; }

        public LeaveEntitlementService EntitlementService { get; }
        public LeaveRequestService LeaveRequestService { get; }
        public AssetService AssetService { get; }
        public TemplateProcessingService TemplateService { get; }
        public EmployeeService EmployeeService { get; }

        public TestHarness()
        {
            var options = new DbContextOptionsBuilder<HrAppDbContext>()
                .UseInMemoryDatabase($"hrapp-{Guid.NewGuid()}")
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            Context = new HrAppDbContext(options);

            Employees = new EmployeeRepository(Context);
            LeaveRequests = new LeaveRequestRepository(Context);
            Assets = new AssetRepository(Context);
            AssetAssignments = new AssetAssignmentRepository(Context);
            Entitlements = new LeaveEntitlementRepository(Context);
            Templates = new DocumentTemplateRepository(Context);

            EntitlementService = new LeaveEntitlementService(Entitlements, LeaveRequests, Employees);
            LeaveRequestService = new LeaveRequestService(LeaveRequests, Employees, EntitlementService);
            AssetService = new AssetService(Assets, AssetAssignments, Employees);
            TemplateService = new TemplateProcessingService(Templates, Employees, Assets);
            EmployeeService = new EmployeeService(Employees);
        }

        // --- Fixture builders -------------------------------------------------------

        public Employee AddEmployee(string firstName = "Ada", string lastName = "Lovelace", string email = null)
        {
            var employee = new Employee
            {
                EmployeeID = Guid.NewGuid(),
                FirstName = firstName,
                LastName = lastName,
                Email = email ?? $"{firstName}.{lastName}@example.com".ToLowerInvariant(),
                Position = "Engineer",
                HireDate = new DateTime(2020, 1, 1)
            };
            Context.Employees.Add(employee);
            Context.SaveChanges();
            return employee;
        }

        public Asset AddAsset(Guid? holderId = null, string name = "Laptop", string serial = null)
        {
            var asset = new Asset
            {
                AssetID = Guid.NewGuid(),
                Name = name,
                SerialNumber = serial ?? $"SN-{Guid.NewGuid():N}".Substring(0, 12),
                Description = "Test asset",
                IsActive = true,
                EmployeeID = holderId,
                AssignmentDate = holderId.HasValue ? DateTime.UtcNow.Date : null
            };
            Context.Assets.Add(asset);
            Context.SaveChanges();
            return asset;
        }

        public LeaveEntitlement AddEntitlement(Guid employeeId, int year, string leaveType, decimal days, decimal carriedOver = 0)
        {
            var entitlement = new LeaveEntitlement
            {
                EntitlementID = Guid.NewGuid(),
                EmployeeID = employeeId,
                Year = year,
                LeaveType = leaveType,
                DaysAllocated = days,
                DaysCarriedOver = carriedOver
            };
            Context.LeaveEntitlements.Add(entitlement);
            Context.SaveChanges();
            return entitlement;
        }

        public LeaveRequest AddLeaveRequest(Guid employeeId, DateTime start, DateTime end, string status = "Pending", string leaveType = "Vacation")
        {
            var request = new LeaveRequest
            {
                RequestID = Guid.NewGuid(),
                EmployeeID = employeeId,
                StartDate = start.Date,
                EndDate = end.Date,
                LeaveType = leaveType,
                Status = status,
                CreatedAt = DateTime.UtcNow
            };
            Context.LeaveRequests.Add(request);
            Context.SaveChanges();
            return request;
        }

        public DocumentTemplate AddTemplate(string content, string name = "Handover")
        {
            var template = new DocumentTemplate
            {
                TemplateID = Guid.NewGuid(),
                TemplateName = name,
                Description = "Test template",
                TemplateContent = content,
                TemplateType = "Asset"
            };
            Context.DocumentTemplates.Add(template);
            Context.SaveChanges();
            return template;
        }

        public void Dispose() => Context.Dispose();
    }
}
