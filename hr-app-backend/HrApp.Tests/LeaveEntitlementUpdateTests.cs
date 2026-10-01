using HrApp.DomainEntities.DTO.Request;
using System;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class LeaveEntitlementUpdateTests
    {
        [Fact]
        public async Task UnchangedAllowance_UpdateSucceeds()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20, 2);

            await h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2030, "Vacation", 20, 2));

            var updated = await h.EntitlementService.GetByIdAsync(entitlement.EntitlementID);
            Assert.Equal(20, updated.DaysAllocated);
            Assert.Equal(2, updated.DaysCarriedOver);
        }

        [Fact]
        public async Task TargetYearChange_ValidatesTheTargetYearInsteadOfSourceCommitments()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 1, 1), new DateTime(2030, 1, 10), "Approved");

            await h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2031, "Vacation", 5));

            Assert.Equal(2031, (await h.EntitlementService.GetByIdAsync(entitlement.EntitlementID)).Year);
        }

        [Fact]
        public async Task TargetLeaveTypeChange_ValidatesTheTargetTypeInsteadOfSourceCommitments()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 1, 1), new DateTime(2030, 1, 10), "Approved", "Vacation");

            await h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2030, "Sick", 5));

            Assert.Equal("Sick", (await h.EntitlementService.GetByIdAsync(entitlement.EntitlementID)).LeaveType);
        }

        [Fact]
        public async Task DuplicateTargetAllowance_IsRejected()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            h.AddEntitlement(employee.EmployeeID, 2031, "Sick", 10);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2031, "Sick", 20)));
        }

        [Fact]
        public async Task TargetYearCommitments_RejectInsufficientAllowance()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2031, 1, 1), new DateTime(2031, 1, 5), "Pending", "Vacation");

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2031, "Vacation", 4)));
        }

        [Fact]
        public async Task TargetLeaveTypeCommitments_RejectInsufficientAllowance()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(employee.EmployeeID, new DateTime(2030, 1, 1), new DateTime(2030, 1, 5), "Approved", "Sick");

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2030, "Sick", 4)));
        }

        [Fact]
        public async Task NegativeAllocationOrCarryOver_IsRejected()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var entitlement = h.AddEntitlement(employee.EmployeeID, 2030, "Vacation", 20);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2030, "Vacation", -1)));
            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.EntitlementService.UpdateAsync(entitlement.EntitlementID, Request(employee.EmployeeID, 2030, "Vacation", 1, -1)));
        }

        private static LeaveEntitlementRequestDto Request(Guid employeeId, int year, string leaveType, decimal allocated, decimal carriedOver = 0) => new()
        {
            EmployeeID = employeeId,
            Year = year,
            LeaveType = leaveType,
            DaysAllocated = allocated,
            DaysCarriedOver = carriedOver
        };
    }
}
