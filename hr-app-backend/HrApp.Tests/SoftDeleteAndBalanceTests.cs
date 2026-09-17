using HrApp.DomainEntities.Models;
using HrApp.Service.Implementation;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class SoftDeleteTests
    {
        [Fact]
        public async Task DeletingAnEmployee_RetiresRatherThanRemovesThem()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();

            await h.EmployeeService.DeleteAsync(employee.EmployeeID);

            // Gone from normal reads...
            Assert.Null(await h.EmployeeService.GetByIdAsync(employee.EmployeeID));
            Assert.Empty(await h.EmployeeService.GetAllAsync());

            // ...but the row is still there.
            var stored = await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID);
            Assert.NotNull(stored);
            Assert.True(stored.IsDeleted);
            Assert.NotNull(stored.DeletedAt);
        }

        [Fact]
        public async Task RetiringAnEmployee_PreservesTheirHistory()
        {
            // The whole point: leave decisions, custody and documents are records of fact
            // that must outlive the employment.
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 6, 1), new DateTime(2030, 6, 5), status: "Approved");
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

            Assert.Single(await h.LeaveRequests.GetByEmployeeIdAsync(employee.EmployeeID));
            Assert.Single(await h.AssetAssignments.GetByEmployeeIdAsync(employee.EmployeeID));
        }

        [Fact]
        public async Task ARetiredEmployee_CanBeRestored()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();

            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            await h.EmployeeService.RestoreAsync(employee.EmployeeID);

            var restored = await h.EmployeeService.GetByIdAsync(employee.EmployeeID);
            Assert.NotNull(restored);
            Assert.Single(await h.EmployeeService.GetAllAsync());
        }

        [Fact]
        public async Task RetiringTwice_DoesNotOverwriteTheOriginalTimestamp()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();

            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            var first = (await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID)).DeletedAt;

            await h.EmployeeService.DeleteAsync(employee.EmployeeID);
            var second = (await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID)).DeletedAt;

            Assert.Equal(first, second);
        }

        [Fact]
        public async Task RestoringAnUnknownEmployee_Throws()
        {
            using var h = new TestHarness();

            await Assert.ThrowsAsync<ArgumentException>(() => h.EmployeeService.RestoreAsync(Guid.NewGuid()));
        }
    }

    public class LeaveBalanceTests
    {
        [Theory]
        // Wholly inside the year
        [InlineData("2030-06-01", "2030-06-05", 2030, 5)]
        // Wholly outside
        [InlineData("2030-06-01", "2030-06-05", 2031, 0)]
        // Straddling New Year: 30, 31 Dec fall in 2030
        [InlineData("2030-12-30", "2031-01-02", 2030, 2)]
        // ...and 1, 2 Jan fall in 2031
        [InlineData("2030-12-30", "2031-01-02", 2031, 2)]
        // A single day
        [InlineData("2030-03-03", "2030-03-03", 2030, 1)]
        // Spanning a whole leap year
        [InlineData("2031-12-31", "2033-01-01", 2032, 366)]
        public void DaysWithinYear_ApportionsAcrossYearBoundaries(string start, string end, int year, int expected)
        {
            var request = new LeaveRequest
            {
                StartDate = DateTime.Parse(start),
                EndDate = DateTime.Parse(end)
            };

            Assert.Equal(expected, LeaveEntitlementService.DaysWithinYear(request, year));
        }

        [Fact]
        public async Task ATypeWithNoEntitlementRow_ReportsAsUntracked()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();

            var balance = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Sick");

            Assert.False(balance.IsTracked);
            Assert.Equal(0, balance.TotalAvailable);
        }

        [Fact]
        public async Task CarriedOverDays_CountTowardsTheTotal()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", days: 20, carriedOver: 5);

            var balance = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Vacation");

            Assert.True(balance.IsTracked);
            Assert.Equal(25, balance.TotalAvailable);
            Assert.Equal(25, balance.DaysRemaining);
        }

        [Fact]
        public async Task ApprovedAndPendingDays_AreCountedSeparatelyButBothCommitted()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 1, 1), new DateTime(2030, 1, 3), status: "Approved");
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 2, 1), new DateTime(2030, 2, 2), status: "Pending");
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 3, 1), new DateTime(2030, 3, 10), status: "Rejected");

            var balance = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Vacation");

            Assert.Equal(3, balance.DaysApproved);
            Assert.Equal(2, balance.DaysPending);
            Assert.Equal(5, balance.DaysCommitted);   // rejected days do not count
            Assert.Equal(15, balance.DaysRemaining);
        }

        [Fact]
        public async Task ReducingAnAllowanceBelowWhatIsCommitted_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            var entitlement = h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 1, 1), new DateTime(2030, 1, 10), status: "Approved");

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID,
                    new DomainEntities.DTO.Request.LeaveEntitlementRequestDto
                    {
                        EmployeeID = e.EmployeeID,
                        Year = 2030,
                        LeaveType = "Vacation",
                        DaysAllocated = 3,
                        DaysCarriedOver = 0
                    }));

            Assert.Contains("already approved or pending", ex.Message);
        }

        [Fact]
        public async Task ASecondAllowanceForTheSameYearAndType_IsRejected()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 20);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EntitlementService.CreateAsync(new DomainEntities.DTO.Request.LeaveEntitlementRequestDto
                {
                    EmployeeID = e.EmployeeID,
                    Year = 2030,
                    LeaveType = "Vacation",
                    DaysAllocated = 5
                }));
        }
    }
}
