using HrApp.DomainEntities.DTO.Request;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class LeaveRequestServiceTests
    {
        private static LeaveRequestRequestDto Request(Guid employeeId, string start, string end, string type = "Vacation")
            => new()
            {
                EmployeeID = employeeId,
                StartDate = DateTime.Parse(start),
                EndDate = DateTime.Parse(end),
                LeaveType = type
            };

        // --- Validation ---------------------------------------------------------

        [Fact]
        public async Task EndDateBeforeStartDate_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-10", "2030-06-05")));

            Assert.Contains("on or after", ex.Message);
        }

        [Fact]
        public async Task SingleDayLeave_IsAllowed()
        {
            // The original check was `EndDate <= StartDate`, which made a one-day request
            // impossible even though TotalDays counts inclusively.
            using var h = new TestHarness();
            var e = h.AddEmployee();

            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-10", "2030-06-10"));

            Assert.Equal(1, created.TotalDays);
            Assert.Equal("Pending", created.Status);
        }

        [Fact]
        public async Task UnknownLeaveType_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-01", "2030-06-02", "Sabbatical")));
        }

        [Fact]
        public async Task UnknownEmployee_IsRejected()
        {
            using var h = new TestHarness();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(Guid.NewGuid(), "2030-06-01", "2030-06-02")));
        }

        // --- Overlap ------------------------------------------------------------

        [Fact]
        public async Task OverlappingRequest_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 10));

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-08", "2030-06-12")));

            Assert.Contains("overlaps", ex.Message);
        }

        [Fact]
        public async Task RejectedRequest_DoesNotBlockTheSameDates()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 10), status: "Rejected");

            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-01", "2030-06-10"));

            Assert.Equal("Pending", created.Status);
        }

        [Fact]
        public async Task AdjacentRequests_DoNotOverlap()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 5));

            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-06", "2030-06-10"));

            Assert.Equal(5, created.TotalDays);
        }

        // --- Decisions ----------------------------------------------------------

        [Fact]
        public async Task Approval_RecordsApproverTimestampAndReason()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            var manager = h.AddEmployee("Grace", "Hopper");
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await h.LeaveRequestService.ApproveRequestAsync(request.RequestID, manager.EmployeeID, "Cover arranged");

            var stored = await h.LeaveRequestService.GetByIdAsync(request.RequestID);
            Assert.Equal("Approved", stored.Status);
            Assert.Equal(manager.EmployeeID, stored.ApprovedByEmployeeID);
            Assert.Equal("Grace Hopper", stored.ApprovedByName);
            Assert.Equal("Cover arranged", stored.DecisionReason);
            Assert.NotNull(stored.DecisionAt);
        }

        [Fact]
        public async Task DecidingAnAlreadySettledRequest_Throws()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            var manager = h.AddEmployee("Grace", "Hopper");
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await h.LeaveRequestService.ApproveRequestAsync(request.RequestID, manager.EmployeeID, null);

            // Flipping a settled decision would silently overwrite the audit trail.
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.LeaveRequestService.RejectRequestAsync(request.RequestID, manager.EmployeeID, null));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, manager.EmployeeID, null));
        }

        [Fact]
        public async Task DecidingYourOwnRequest_Throws()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var request = h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 3));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, employee.EmployeeID, null));
        }

        [Fact]
        public async Task DecidingAMissingRequest_Throws()
        {
            using var h = new TestHarness();
            var manager = h.AddEmployee();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(Guid.NewGuid(), manager.EmployeeID, null));
        }

        // --- Entitlement --------------------------------------------------------

        [Fact]
        public async Task RequestExceedingTheAllowance_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 5);

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-01", "2030-06-10")));

            Assert.Contains("Not enough vacation leave", ex.Message);
        }

        [Fact]
        public async Task RequestWithinTheAllowance_IsAccepted()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 10);

            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-01", "2030-06-05"));

            Assert.Equal(5, created.TotalDays);
        }

        [Fact]
        public async Task PendingDays_AreHeldAgainstTheAllowance()
        {
            // Otherwise an employee with 2 days left could file three more requests and
            // have every one of them approvable.
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 10);
            await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-06-01", "2030-06-08")); // 8 days, pending

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-09-01", "2030-09-05")));

            Assert.Contains("pending", ex.Message);
        }

        [Fact]
        public async Task LeaveTypeWithNoEntitlementRow_IsUncapped()
        {
            // An absent row means "not capped here", not "zero days".
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 1);

            var created = await h.LeaveRequestService.CreateAsync(
                Request(e.EmployeeID, "2030-06-01", "2030-06-20", "Sick"));

            Assert.Equal(20, created.TotalDays);
        }

        [Fact]
        public async Task RequestSpanningNewYear_IsChargedToBothYears()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 10);
            h.AddEntitlement(e.EmployeeID, 2031, "Vacation", 1);

            // 30 Dec - 2 Jan is 2 days in 2030 and 2 in 2031; 2031 only allows 1.
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-12-30", "2031-01-02")));

            Assert.Contains("in 2031", ex.Message);

            // Ending a day earlier leaves exactly 1 day in 2031, which fits.
            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-12-30", "2031-01-01"));
            Assert.Equal(3, created.TotalDays);

            var balance2030 = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Vacation");
            var balance2031 = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2031, "Vacation");
            Assert.Equal(2, balance2030.DaysPending);
            Assert.Equal(1, balance2031.DaysPending);
        }
    }
}
