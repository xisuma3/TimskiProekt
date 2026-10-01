using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// Skip-level approval, approval delegation, the erasure audit log, monthly accrual and
    /// year-end carry-over.
    /// </summary>
    public class OpenFeaturesTests
    {
        private static LeaveRequestRequestDto Request(Guid employeeId, string start, string end, string type = "Vacation") => new()
        {
            EmployeeID = employeeId,
            StartDate = DateTime.Parse(start),
            EndDate = DateTime.Parse(end),
            LeaveType = type,
        };

        // org:  Director -> Manager -> Report ;  Peer (another manager, not in the chain)
        private static (TestHarness h, Employee director, Employee manager, Employee report, Employee peer) Org()
        {
            var h = new TestHarness { Today = new DateTime(2030, 6, 1) };
            var director = h.AddEmployee("Dana", "Director");
            var manager = h.AddEmployee("Mia", "Manager", managerId: director.EmployeeID);
            var report = h.AddEmployee("Rui", "Report", managerId: manager.EmployeeID);
            var peer = h.AddEmployee("Pat", "Peer", managerId: director.EmployeeID);
            return (h, director, manager, report, peer);
        }

        // --- Skip-level approval --------------------------------------------------------

        [Fact]
        public async Task ManagersManager_CanDecide_OnTheirOwnAuthority()
        {
            var (h, director, _, report, _) = Org();
            using var _h = h;
            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));

            await h.LeaveRequestService.ApproveRequestAsync(request.RequestID, director.EmployeeID, "Escalated", approverIsAdmin: false);

            var stored = await h.LeaveRequestService.GetByIdAsync(request.RequestID);
            Assert.Equal("Approved", stored.Status);
            Assert.Equal(director.EmployeeID, stored.ApprovedByEmployeeID);
            Assert.Null(stored.DecidedOnBehalfOfEmployeeID);
        }

        [Fact]
        public async Task ManagerOutsideTheReportingLine_IsRefused()
        {
            var (h, _, _, report, peer) = Org();
            using var _h = h;
            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, peer.EmployeeID, null, approverIsAdmin: false));
        }

        [Fact]
        public async Task TeamView_ListsDirectAndIndirectReports_WithTheirRoute()
        {
            var (h, director, manager, report, _) = Org();
            using var _h = h;
            h.AddLeaveRequest(manager.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 2));
            h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 5), new DateTime(2030, 7, 6));
            h.AddLeaveRequest(director.EmployeeID, new DateTime(2030, 7, 8), new DateTime(2030, 7, 9));

            var team = (await h.LeaveRequestService.GetForManagerAsync(director.EmployeeID)).ToList();

            Assert.Equal(2, team.Count); // never their own request
            Assert.Equal("Direct report", team.Single(r => r.EmployeeID == manager.EmployeeID).ApprovalRoute);
            Assert.Equal("Indirect report", team.Single(r => r.EmployeeID == report.EmployeeID).ApprovalRoute);
        }

        [Fact]
        public async Task ACycleInTheOrgChart_DoesNotHang()
        {
            using var h = new TestHarness();
            var a = h.AddEmployee("A", "One");
            var b = h.AddEmployee("B", "Two", managerId: a.EmployeeID);
            a.ManagerID = b.EmployeeID; // corrupt data: A and B manage each other
            h.Context.SaveChanges();
            var outsider = h.AddEmployee("C", "Three");
            var request = h.AddLeaveRequest(b.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 1));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, outsider.EmployeeID, null, approverIsAdmin: false));
            Assert.Single(await h.LeaveRequestService.GetForManagerAsync(a.EmployeeID));
        }

        // --- Delegation ---------------------------------------------------------------

        [Fact]
        public async Task Delegate_DecidesForTheDelegatorsTeam_AndTheDecisionRecordsWhoseBehalf()
        {
            var (h, _, manager, report, peer) = Org();
            using var _h = h;
            await h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID, new ApprovalDelegationRequestDto
            {
                DelegateEmployeeID = peer.EmployeeID,
                StartDate = new DateTime(2030, 6, 1),
                EndDate = new DateTime(2030, 6, 14),
                Note = "Away on holiday",
            });
            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));

            var team = (await h.LeaveRequestService.GetForManagerAsync(peer.EmployeeID)).ToList();
            Assert.Equal("Delegated by Mia Manager", Assert.Single(team).ApprovalRoute);

            await h.LeaveRequestService.ApproveRequestAsync(request.RequestID, peer.EmployeeID, null, approverIsAdmin: false);
            var stored = await h.LeaveRequestService.GetByIdAsync(request.RequestID);
            Assert.Equal(peer.EmployeeID, stored.ApprovedByEmployeeID);
            Assert.Equal(manager.EmployeeID, stored.DecidedOnBehalfOfEmployeeID);
            Assert.Equal("Mia Manager", stored.DecidedOnBehalfOfName);
        }

        [Fact]
        public async Task Delegate_HasNoAuthority_OutsideTheWindow_OrAfterRevoking()
        {
            var (h, _, manager, report, peer) = Org();
            using var _h = h;
            var delegation = await h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID, new ApprovalDelegationRequestDto
            {
                DelegateEmployeeID = peer.EmployeeID,
                StartDate = new DateTime(2030, 6, 10),
                EndDate = new DateTime(2030, 6, 20),
            });
            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));

            // Today is 1 June: not started yet.
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, peer.EmployeeID, null, approverIsAdmin: false));

            h.Today = new DateTime(2030, 6, 12);
            await h.DelegationService.RevokeAsync(delegation.DelegationID, peer.EmployeeID, callerIsAdmin: false); // the delegate declines
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, peer.EmployeeID, null, approverIsAdmin: false));
        }

        [Fact]
        public async Task Delegations_DoNotChain()
        {
            var (h, _, manager, report, peer) = Org();
            using var _h = h;
            var third = h.AddEmployee("Tia", "Third");
            var window = new ApprovalDelegationRequestDto { StartDate = h.Today, EndDate = h.Today.AddDays(7) };

            window.DelegateEmployeeID = peer.EmployeeID;
            await h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID, window);
            window.DelegateEmployeeID = third.EmployeeID;
            await h.DelegationService.CreateAsync(peer.EmployeeID, peer.EmployeeID, window);

            var request = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(request.RequestID, third.EmployeeID, null, approverIsAdmin: false));
        }

        [Fact]
        public async Task Delegate_CannotDecideTheirOwnRequest()
        {
            var (h, _, manager, report, _) = Org();
            using var _h = h;
            await h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID, new ApprovalDelegationRequestDto
            {
                DelegateEmployeeID = report.EmployeeID, StartDate = h.Today, EndDate = h.Today.AddDays(3),
            });
            var own = h.AddLeaveRequest(report.EmployeeID, new DateTime(2030, 7, 1), new DateTime(2030, 7, 3));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.LeaveRequestService.ApproveRequestAsync(own.RequestID, report.EmployeeID, null, approverIsAdmin: false));
            Assert.Empty(await h.LeaveRequestService.GetForManagerAsync(report.EmployeeID));
        }

        [Fact]
        public async Task CreatingADelegation_IsValidated()
        {
            var (h, _, manager, _, peer) = Org();
            using var _h = h;
            Task Create(Guid to, string start, string end) => h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID,
                new ApprovalDelegationRequestDto { DelegateEmployeeID = to, StartDate = DateTime.Parse(start), EndDate = DateTime.Parse(end) });

            await Assert.ThrowsAsync<ArgumentException>(() => Create(manager.EmployeeID, "2030-06-01", "2030-06-05")); // to self
            await Assert.ThrowsAsync<ArgumentException>(() => Create(peer.EmployeeID, "2030-06-05", "2030-06-01"));    // backwards
            await Assert.ThrowsAsync<ArgumentException>(() => Create(peer.EmployeeID, "2030-05-01", "2030-05-10"));    // already over
            await Create(peer.EmployeeID, "2030-06-01", "2030-06-10");
            await Assert.ThrowsAsync<InvalidOperationException>(() => Create(peer.EmployeeID, "2030-06-08", "2030-06-12")); // overlaps
        }

        [Fact]
        public async Task OnlyThePeopleInvolved_OrAnAdmin_CanRevoke()
        {
            var (h, director, manager, _, peer) = Org();
            using var _h = h;
            var d = await h.DelegationService.CreateAsync(manager.EmployeeID, manager.EmployeeID, new ApprovalDelegationRequestDto
            {
                DelegateEmployeeID = peer.EmployeeID, StartDate = h.Today, EndDate = h.Today.AddDays(5),
            });

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.DelegationService.RevokeAsync(d.DelegationID, director.EmployeeID, callerIsAdmin: false));
            await h.DelegationService.RevokeAsync(d.DelegationID, director.EmployeeID, callerIsAdmin: true);
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                h.DelegationService.RevokeAsync(d.DelegationID, manager.EmployeeID, callerIsAdmin: false));
            Assert.Equal("Revoked", (await h.DelegationService.GetInvolvingAsync(manager.EmployeeID)).Single().Status);
        }

        // --- Directory (for picking cover) ----------------------------------------------

        [Fact]
        public async Task Directory_ListsCurrentColleagues_WithoutPersonalData()
        {
            using var h = new TestHarness();
            var keep = h.AddEmployee("Ada", "Lovelace");
            var gone = h.AddEmployee("Old", "Timer");
            await h.EmployeeService.DeleteAsync(gone.EmployeeID);

            var directory = (await h.EmployeeService.GetDirectoryAsync()).ToList();

            var entry = Assert.Single(directory);
            Assert.Equal(keep.EmployeeID, entry.EmployeeID);
            Assert.Equal("Ada Lovelace", entry.Name);
            Assert.DoesNotContain(typeof(HrApp.DomainEntities.DTO.Response.EmployeeDirectoryEntryDto).GetProperties(),
                p => p.Name is "Email" or "HireDate" or "ManagerID");
        }
        // --- Erasure audit ------------------------------------------------------------

        [Fact]
        public async Task Erasure_WritesAnAuditRecord_NamingWhoAndWhy()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            await h.EmployeeService.DeleteAsync(employee.EmployeeID);

            await h.EraseAsync(employee.EmployeeID, requestedBy: "The employee, by email", reason: "Art. 17 request");

            var record = Assert.Single(await h.EmployeeService.GetErasureLogAsync());
            Assert.Equal(employee.EmployeeID, record.EmployeeID);
            Assert.Equal(h.HrPerformer.EmployeeID, record.PerformedByEmployeeID);
            Assert.Equal("Hr Performer", record.PerformedByName);
            Assert.Equal("The employee, by email", record.RequestedBy);
            Assert.Equal("Art. 17 request", record.Reason);
        }

        [Fact]
        public async Task Erasure_WithoutAReason_IsRefused_AndNothingIsErased()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            await h.EmployeeService.DeleteAsync(employee.EmployeeID);

            await Assert.ThrowsAsync<ArgumentException>(() => h.EraseAsync(employee.EmployeeID, reason: " "));

            var stored = await h.Employees.GetByIdIncludingDeletedAsync(employee.EmployeeID);
            Assert.False(stored.IsErased);
            Assert.Equal("Ada", stored.FirstName);
            Assert.Empty(await h.EmployeeService.GetErasureLogAsync());
        }

        [Fact]
        public async Task NobodyCanEraseThemselves()
        {
            using var h = new TestHarness();
            var admin = h.AddEmployee("Self", "Admin");
            await h.EmployeeService.DeleteAsync(admin.EmployeeID);

            // Retired, so they can't log in anyway — but the rule holds regardless.
            await Assert.ThrowsAsync<ArgumentException>(() => h.EmployeeService.EraseAsync(admin.EmployeeID, admin.EmployeeID,
                new EraseEmployeeRequestDto { RequestedBy = "Me", Reason = "Test" }));
        }

        // --- Accrual ------------------------------------------------------------------

        [Fact]
        public async Task MonthlyAccrual_GrantsATwelfthPerStartedMonth()
        {
            using var h = new TestHarness { Today = new DateTime(2030, 4, 15) };
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 12, carriedOver: 2, accrual: LeaveEntitlement.AccrualMonthly);

            var now = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Vacation");
            Assert.Equal(4m, now.DaysAccrued);
            Assert.Equal(6m, now.DaysAvailable); // carried-over days are available in full
            Assert.Equal(14m, now.TotalAvailable);

            var yearEnd = await h.EntitlementService.GetBalanceAsync(e.EmployeeID, 2030, "Vacation", new DateTime(2030, 12, 31));
            Assert.Equal(12m, yearEnd.DaysAccrued);
        }

        [Fact]
        public async Task MonthlyAccrual_LetsYouBookWhatWillHaveAccruedByTheLeave()
        {
            using var h = new TestHarness { Today = new DateTime(2030, 4, 15) };
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 12, accrual: LeaveEntitlement.AccrualMonthly);

            // April: 4 accrued, so 5 days in April is too many...
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-04-20", "2030-04-24")));
            Assert.Contains("accrues monthly", ex.Message);

            // ...but by October 10 will have accrued, so a week in October is fine.
            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-10-01", "2030-10-07"));
            Assert.Equal(7, created.TotalDays);
        }

        [Fact]
        public async Task UpfrontAllowances_AreUnaffected()
        {
            using var h = new TestHarness { Today = new DateTime(2030, 1, 2) };
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 20);

            var created = await h.LeaveRequestService.CreateAsync(Request(e.EmployeeID, "2030-01-05", "2030-01-24"));
            Assert.Equal(20, created.TotalDays);
        }

        // --- Carry-over ---------------------------------------------------------------

        [Fact]
        public async Task CarryOver_MovesUnusedDaysUpToTheCap_AndCreatesNextYearsAllowance()
        {
            using var h = new TestHarness();
            var light = h.AddEmployee("Lou", "Light");
            var heavy = h.AddEmployee("Hal", "Heavy");
            h.AddEntitlement(light.EmployeeID, 2030, "Vacation", 20, accrual: LeaveEntitlement.AccrualMonthly);
            h.AddEntitlement(heavy.EmployeeID, 2030, "Vacation", 20);
            h.AddLeaveRequest(light.EmployeeID, new DateTime(2030, 3, 1), new DateTime(2030, 3, 2), status: "Approved");   // 18 unused
            h.AddLeaveRequest(heavy.EmployeeID, new DateTime(2030, 3, 1), new DateTime(2030, 3, 17), status: "Approved");  // 3 unused

            var results = (await h.EntitlementService.CarryOverAsync(new CarryOverRequestDto { FromYear = 2030, MaxDays = 5 })).ToList();

            var lightResult = results.Single(r => r.EmployeeID == light.EmployeeID);
            Assert.Equal(18m, lightResult.UnusedDays);
            Assert.Equal(5m, lightResult.CarriedDays);
            Assert.Equal("Created", lightResult.Action);
            Assert.Equal(3m, results.Single(r => r.EmployeeID == heavy.EmployeeID).CarriedDays);

            var next = await h.Entitlements.GetForAsync(light.EmployeeID, 2031, "Vacation");
            Assert.Equal(20m, next.DaysAllocated);
            Assert.Equal(5m, next.DaysCarriedOver);
            Assert.Equal(LeaveEntitlement.AccrualMonthly, next.AccrualMethod);
        }

        [Fact]
        public async Task CarryOver_PreviewSavesNothing_AndARerunIsUnchanged()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 10);

            var preview = (await h.EntitlementService.CarryOverAsync(new CarryOverRequestDto { FromYear = 2030, MaxDays = 5, Preview = true })).Single();
            Assert.Equal("Created", preview.Action);
            Assert.Null(await h.Entitlements.GetForAsync(e.EmployeeID, 2031, "Vacation"));

            await h.EntitlementService.CarryOverAsync(new CarryOverRequestDto { FromYear = 2030, MaxDays = 5 });
            var rerun = (await h.EntitlementService.CarryOverAsync(new CarryOverRequestDto { FromYear = 2030, MaxDays = 5 })).Single();
            Assert.Equal("Unchanged", rerun.Action);
            Assert.Equal(5m, (await h.Entitlements.GetForAsync(e.EmployeeID, 2031, "Vacation")).DaysCarriedOver);
        }

        [Fact]
        public async Task CarryOver_WillNotStrandDaysAlreadyBookedNextYear()
        {
            using var h = new TestHarness();
            var e = h.AddEmployee();
            h.AddEntitlement(e.EmployeeID, 2030, "Vacation", 10);
            h.AddEntitlement(e.EmployeeID, 2031, "Vacation", 10, carriedOver: 5);
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2030, 2, 1), new DateTime(2030, 2, 10), status: "Approved"); // 0 unused in 2030
            h.AddLeaveRequest(e.EmployeeID, new DateTime(2031, 2, 1), new DateTime(2031, 2, 14), status: "Approved"); // 14 booked in 2031

            var result = (await h.EntitlementService.CarryOverAsync(new CarryOverRequestDto { FromYear = 2030, MaxDays = 5 })).Single();

            Assert.Equal("Skipped", result.Action);
            Assert.Equal(5m, (await h.Entitlements.GetForAsync(e.EmployeeID, 2031, "Vacation")).DaysCarriedOver);
        }
    }
}
