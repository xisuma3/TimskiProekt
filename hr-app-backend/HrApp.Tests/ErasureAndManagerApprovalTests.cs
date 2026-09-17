using HrApp.DomainEntities.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class ErasureTests
    {
        private static async Task<Employee> RetiredEmployeeWithHistory(TestHarness h)
        {
            var employee = h.AddEmployee("Ada", "Lovelace", "ada@example.com");

            h.Context.EmployeeDossiers.Add(new EmployeeDossier
            {
                DossierID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                BirthDate = new DateTime(1980, 1, 1),
                Address = "12 Analytical Engine Way",
                EmergencyContact = "Charles Babbage - 555",
                EmploymentType = "Full-Time"
            });

            var template = h.AddTemplate("body");
            h.Context.GeneratedDocuments.Add(new GeneratedDocument
            {
                DocumentID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID,
                Content = "Ada Lovelace, 12 Analytical Engine Way",
                GeneratedDate = DateTime.UtcNow
            });

            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3), status: "Approved");

            var asset = h.AddAsset(employee.EmployeeID);
            h.Context.AssetAssignments.Add(new AssetAssignment
            {
                AssignmentID = Guid.NewGuid(),
                AssetID = asset.AssetID,
                EmployeeID = employee.EmployeeID,
                AssignedDate = DateTime.UtcNow.Date
            });
            h.Context.SaveChanges();

            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            return employee;
        }

        [Fact]
        public async Task ErasingAnActiveEmployee_IsRefused()
        {
            // Two steps on purpose: erasing someone still employed is almost certainly a
            // mistake, and erasure cannot be undone.
            using var h = new TestHarness();
            var employee = h.AddEmployee();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EmployeeService.EraseAsync(employee.EmployeeID));

            Assert.Contains("Retire the employee before erasing", ex.Message);
        }

        [Fact]
        public async Task Erasure_DestroysPersonalData()
        {
            using var h = new TestHarness();
            var employee = await RetiredEmployeeWithHistory(h);

            await h.EmployeeService.EraseAsync(employee.EmployeeID);

            var erased = await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID);
            Assert.True(erased.IsErased);
            Assert.NotNull(erased.ErasedAt);
            Assert.Equal("Erased", erased.FirstName);
            Assert.Null(erased.Email);
            Assert.Null(erased.Position);

            // The dossier is nothing but personal data.
            Assert.False(await h.Context.EmployeeDossiers.AnyAsync(d => d.EmployeeID == employee.EmployeeID));

            // Document bodies embed the name and address verbatim.
            var document = await h.Context.GeneratedDocuments.SingleAsync(g => g.EmployeeID == employee.EmployeeID);
            Assert.Equal("[erased]", document.Content);
            Assert.DoesNotContain("Analytical Engine", document.Content);
        }

        [Fact]
        public async Task Erasure_KeepsRecordsTheEmployerMustRetain()
        {
            using var h = new TestHarness();
            var employee = await RetiredEmployeeWithHistory(h);

            await h.EmployeeService.EraseAsync(employee.EmployeeID);

            // What the company did, and what happened to company property, survive.
            Assert.Single(await h.LeaveRequests.GetByEmployeeIdAsync(employee.EmployeeID));
            Assert.Single(await h.AssetAssignments.GetByEmployeeIdAsync(employee.EmployeeID));

            // The document row stays, so the audit trail still shows one was issued.
            Assert.True(await h.Context.GeneratedDocuments.AnyAsync(g => g.EmployeeID == employee.EmployeeID));
        }

        [Fact]
        public async Task AnErasedEmployee_CannotBeRestored()
        {
            using var h = new TestHarness();
            var employee = await RetiredEmployeeWithHistory(h);
            await h.EmployeeService.EraseAsync(employee.EmployeeID);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EmployeeService.RestoreAsync(employee.EmployeeID));

            Assert.Contains("cannot be restored", ex.Message);
        }

        [Fact]
        public async Task ErasingTwice_IsRefused()
        {
            using var h = new TestHarness();
            var employee = await RetiredEmployeeWithHistory(h);
            await h.EmployeeService.EraseAsync(employee.EmployeeID);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EmployeeService.EraseAsync(employee.EmployeeID));
        }
    }

    public class ManagerApprovalTests
    {
        [Fact]
        public async Task AManager_CanDecideTheirOwnReportsRequest()
        {
            using var h = new TestHarness();
            var manager = h.AddEmployee("Grace", "Hopper");
            var report = h.AddEmployee("Ada", "Lovelace");
            report.ManagerID = manager.EmployeeID;
            h.Context.SaveChanges();

            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await h.LeaveRequestService.ApproveRequestAsync(
                request.RequestID, manager.EmployeeID, "Fine by me", approverIsAdmin: false);

            var stored = await h.LeaveRequestService.GetByIdAsync(request.RequestID);
            Assert.Equal("Approved", stored.Status);
            Assert.Equal("Grace Hopper", stored.ApprovedByName);
        }

        [Fact]
        public async Task SomeoneElsesManager_CannotDecideTheRequest()
        {
            // Authority comes from the org chart, not from merely holding a token.
            using var h = new TestHarness();
            var theirManager = h.AddEmployee("Grace", "Hopper");
            var unrelatedManager = h.AddEmployee("Alan", "Turing");
            var report = h.AddEmployee("Ada", "Lovelace");
            report.ManagerID = theirManager.EmployeeID;
            h.Context.SaveChanges();

            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(
                    request.RequestID, unrelatedManager.EmployeeID, null, approverIsAdmin: false));
        }

        [Fact]
        public async Task AnEmployeeWithNoManager_CannotHaveTheirLeaveDecidedByAPeer()
        {
            using var h = new TestHarness();
            var peer = h.AddEmployee("Alan", "Turing");
            var employee = h.AddEmployee("Ada", "Lovelace");
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(
                    request.RequestID, peer.EmployeeID, null, approverIsAdmin: false));
        }

        [Fact]
        public async Task AnAdmin_CanDecideAnyRequest()
        {
            using var h = new TestHarness();
            var admin = h.AddEmployee("System", "Administrator");
            var employee = h.AddEmployee("Ada", "Lovelace");
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await h.LeaveRequestService.ApproveRequestAsync(
                request.RequestID, admin.EmployeeID, null, approverIsAdmin: true);

            var stored = await h.LeaveRequestService.GetByIdAsync(request.RequestID);
            Assert.Equal("Approved", stored.Status);
        }

        [Fact]
        public async Task AManager_StillCannotDecideTheirOwnRequest()
        {
            // Self-approval stays barred even for someone who manages themselves in the data.
            using var h = new TestHarness();
            var manager = h.AddEmployee("Grace", "Hopper");
            manager.ManagerID = manager.EmployeeID;
            h.Context.SaveChanges();

            var request = h.AddLeaveRequest(manager.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(
                    request.RequestID, manager.EmployeeID, null, approverIsAdmin: false));

            Assert.Contains("your own", ex.Message);
        }

        [Fact]
        public async Task AManagersTeamView_ShowsOnlyTheirReports()
        {
            using var h = new TestHarness();
            var manager = h.AddEmployee("Grace", "Hopper");
            var report = h.AddEmployee("Ada", "Lovelace");
            var stranger = h.AddEmployee("Alan", "Turing");
            report.ManagerID = manager.EmployeeID;
            h.Context.SaveChanges();

            h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));
            h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 8, 1), new DateTime(2030, 8, 3), status: "Approved");
            h.AddLeaveRequest(stranger.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            var all = (await h.LeaveRequestService.GetForManagerAsync(manager.EmployeeID)).ToList();
            var pending = (await h.LeaveRequestService.GetForManagerAsync(manager.EmployeeID, pendingOnly: true)).ToList();

            Assert.Equal(2, all.Count);
            Assert.All(all, r => Assert.Equal("Ada Lovelace", r.EmployeeName));
            Assert.Single(pending);
            Assert.Equal("Pending", pending[0].Status);
        }

        [Fact]
        public async Task AManagersTeamView_ExcludesRetiredReports()
        {
            using var h = new TestHarness();
            var manager = h.AddEmployee("Grace", "Hopper");
            var report = h.AddEmployee("Ada", "Lovelace");
            report.ManagerID = manager.EmployeeID;
            h.Context.SaveChanges();
            h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await h.EmployeeService.DeleteAsync(report.EmployeeID);

            Assert.Empty(await h.LeaveRequestService.GetForManagerAsync(manager.EmployeeID));
        }
    }
}
