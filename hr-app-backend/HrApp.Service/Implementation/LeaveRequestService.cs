using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class LeaveRequestService : ILeaveRequestService
    {
        private const string StatusPending = "Pending";
        private const string StatusApproved = "Approved";
        private const string StatusRejected = "Rejected";

        private static readonly HashSet<string> AllowedLeaveTypes =
            new(StringComparer.OrdinalIgnoreCase) { "Vacation", "Sick", "Parental", "Unpaid" };

        private readonly ILeaveRequestRepository _repository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly ILeaveEntitlementService _entitlementService;
        private readonly IApprovalDelegationRepository _delegationRepository;
        private readonly Func<DateTime> _today;

        public LeaveRequestService(
            ILeaveRequestRepository repository,
            IEmployeeRepository employeeRepository,
            ILeaveEntitlementService entitlementService,
            IApprovalDelegationRepository delegationRepository,
            Func<DateTime> today = null)
        {
            _repository = repository;
            _employeeRepository = employeeRepository;
            _entitlementService = entitlementService;
            _delegationRepository = delegationRepository;
            _today = today ?? (() => DateTime.UtcNow.Date);
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetAllAsync()
        {
            var requests = await _repository.GetAllAsync();
            return requests.Select(MapToDto);
        }

        public async Task<LeaveRequestResponseDto> GetByIdAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id);
            return request == null ? null : MapToDto(request);
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetByEmployeeIdAsync(Guid employeeId)
        {
            var requests = await _repository.GetByEmployeeIdAsync(employeeId);
            return requests.Select(MapToDto);
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetPendingRequestsAsync()
        {
            var requests = await _repository.GetPendingRequestsAsync();
            return requests.Select(MapToDto);
        }

        public async Task<LeaveRequestResponseDto> CreateAsync(LeaveRequestRequestDto dto)
        {
            var startDate = dto.StartDate.Date;
            var endDate = dto.EndDate.Date;

            if (endDate < startDate)
            {
                throw new ArgumentException("End date must be on or after start date");
            }

            if (string.IsNullOrWhiteSpace(dto.LeaveType) || !AllowedLeaveTypes.Contains(dto.LeaveType))
            {
                throw new ArgumentException(
                    $"Leave type must be one of: {string.Join(", ", AllowedLeaveTypes)}");
            }

            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null)
            {
                throw new ArgumentException("Employee not found");
            }

            // Stop the same days being booked twice. Rejected requests don't count.
            var overlapping = await _repository.GetOverlappingAsync(dto.EmployeeID, startDate, endDate);
            if (overlapping.Any())
            {
                var clash = overlapping.First();
                throw new ArgumentException(
                    $"This overlaps an existing {clash.Status.ToLowerInvariant()} request " +
                    $"({clash.StartDate:yyyy-MM-dd} to {clash.EndDate:yyyy-MM-dd})");
            }

            // Entitlement. A request spanning New Year is charged to both years, so each
            // year it touches has to have the days available.
            await GuardSufficientBalance(dto.EmployeeID, startDate, endDate, dto.LeaveType);

            var leaveRequest = new LeaveRequest
            {
                EmployeeID = dto.EmployeeID,
                StartDate = startDate,
                EndDate = endDate,
                LeaveType = dto.LeaveType,
                Status = StatusPending,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.AddAsync(leaveRequest);
            return await GetByIdAsync(created.RequestID);
        }

        /// <summary>
        /// Rejects the request unless the employee has an allowance for this leave type in
        /// every year it touches, with enough days left in each. A missing entitlement row
        /// means no allowance — leave of that type can't be requested until HR sets one up.
        /// </summary>
        private async Task GuardSufficientBalance(
            Guid employeeId, DateTime startDate, DateTime endDate, string leaveType)
        {
            for (var year = startDate.Year; year <= endDate.Year; year++)
            {
                var daysThisYear = DaysInYear(startDate, endDate, year);
                if (daysThisYear == 0) continue;

                // Monthly accrual: an employee may book what will have accrued by the last day
                // of the leave in this year, not just what has accrued today.
                var lastDayThisYear = endDate.Year > year ? new DateTime(year, 12, 31) : endDate;
                var balance = await _entitlementService.GetBalanceAsync(employeeId, year, leaveType, lastDayThisYear);
                if (!balance.IsTracked)
                {
                    throw new ArgumentException(
                        $"No {leaveType.ToLowerInvariant()} leave allowance has been set up for {year}. " +
                        "Ask HR to add one before requesting this leave.");
                }

                if (daysThisYear > balance.DaysRemaining)
                {
                    var yearNote = startDate.Year == endDate.Year ? "" : $" in {year}";
                    var accrualNote = balance.DaysAccrued < balance.DaysAllocated
                        ? $" by {lastDayThisYear:yyyy-MM-dd} (accrues monthly; {balance.DaysAccrued} of {balance.DaysAllocated} accrued by then)"
                        : "";
                    throw new ArgumentException(
                        $"Not enough {leaveType.ToLowerInvariant()} leave{yearNote}: " +
                        $"requesting {daysThisYear} day(s) but only {balance.DaysRemaining} of " +
                        $"{balance.DaysAvailable} remain{accrualNote} ({balance.DaysApproved} approved, {balance.DaysPending} pending).");
                }
            }
        }

        private static int DaysInYear(DateTime startDate, DateTime endDate, int year)
        {
            var yearStart = new DateTime(year, 1, 1);
            var yearEnd = new DateTime(year, 12, 31);

            var start = startDate.Date > yearStart ? startDate.Date : yearStart;
            var end = endDate.Date < yearEnd ? endDate.Date : yearEnd;

            return end < start ? 0 : (end - start).Days + 1;
        }

        public Task ApproveRequestAsync(Guid id, Guid? approverEmployeeId, string reason) =>
            DecideAsync(id, StatusApproved, approverEmployeeId, reason, approverIsAdmin: true);

        public Task RejectRequestAsync(Guid id, Guid? approverEmployeeId, string reason) =>
            DecideAsync(id, StatusRejected, approverEmployeeId, reason, approverIsAdmin: true);

        public Task ApproveRequestAsync(Guid id, Guid? approverEmployeeId, string reason, bool approverIsAdmin) =>
            DecideAsync(id, StatusApproved, approverEmployeeId, reason, approverIsAdmin);

        public Task RejectRequestAsync(Guid id, Guid? approverEmployeeId, string reason, bool approverIsAdmin) =>
            DecideAsync(id, StatusRejected, approverEmployeeId, reason, approverIsAdmin);

        /// <summary>
        /// Every request the approver may decide without being an admin: their direct and
        /// indirect reports (skip-level), plus the reports of anyone who has delegated to
        /// them today. Each carries <see cref="LeaveRequestResponseDto.ApprovalRoute"/>.
        /// The approver's own requests are never included.
        /// </summary>
        public async Task<IEnumerable<LeaveRequestResponseDto>> GetForManagerAsync(Guid managerEmployeeId, bool pendingOnly = false)
        {
            var managers = await _employeeRepository.GetManagerMapAsync();
            var routes = new Dictionary<Guid, string>();

            foreach (var id in DescendantsOf(managerEmployeeId, managers))
            {
                routes[id] = managers.TryGetValue(id, out var m) && m == managerEmployeeId ? "Direct report" : "Indirect report";
            }

            foreach (var delegation in await _delegationRepository.GetActiveForDelegateAsync(managerEmployeeId, _today()))
            {
                var name = delegation.Delegator == null ? "a manager" : $"{delegation.Delegator.FirstName} {delegation.Delegator.LastName}";
                foreach (var id in DescendantsOf(delegation.DelegatorEmployeeID, managers))
                {
                    // Own authority wins over a delegated route for the same person.
                    routes.TryAdd(id, $"Delegated by {name}");
                }
            }

            routes.Remove(managerEmployeeId);
            var requests = await _repository.GetForEmployeesAsync(routes.Keys.ToList(), pendingOnly);
            return requests.Select(r =>
            {
                var dto = MapToDto(r);
                dto.ApprovalRoute = routes[r.EmployeeID];
                return dto;
            });
        }

        /// <summary>The employee's managers, nearest first. Cycle-safe.</summary>
        private static List<Guid> ManagerChain(Guid employeeId, IReadOnlyDictionary<Guid, Guid?> managers)
        {
            var chain = new List<Guid>();
            var seen = new HashSet<Guid> { employeeId };
            var current = employeeId;
            while (managers.TryGetValue(current, out var manager) && manager.HasValue && seen.Add(manager.Value))
            {
                chain.Add(manager.Value);
                current = manager.Value;
            }
            return chain;
        }

        /// <summary>Everyone who reports to <paramref name="rootId"/>, directly or not. Cycle-safe.</summary>
        private static HashSet<Guid> DescendantsOf(Guid rootId, IReadOnlyDictionary<Guid, Guid?> managers)
        {
            var children = managers
                .Where(kv => kv.Value.HasValue)
                .GroupBy(kv => kv.Value.Value)
                .ToDictionary(g => g.Key, g => g.Select(kv => kv.Key).ToList());

            var result = new HashSet<Guid>();
            var queue = new Queue<Guid>();
            queue.Enqueue(rootId);
            while (queue.Count > 0)
            {
                var id = queue.Dequeue();
                if (!children.TryGetValue(id, out var reports)) continue;
                foreach (var report in reports)
                {
                    if (report != rootId && result.Add(report)) queue.Enqueue(report);
                }
            }
            return result;
        }

        /// <summary>
        /// Whether <paramref name="approverId"/> may decide a request filed by
        /// <paramref name="requesterId"/>, and if so, whose authority they exercise.
        /// Order: admin; anyone above the requester in the reporting line (skip-level);
        /// a delegate of anyone above the requester. Delegations do not chain.
        /// </summary>
        private async Task<(bool Allowed, Guid? OnBehalfOf)> ResolveAuthorityAsync(
            Guid approverId, Guid requesterId, bool approverIsAdmin)
        {
            if (approverIsAdmin) return (true, null);

            var managers = await _employeeRepository.GetManagerMapAsync();
            var chain = ManagerChain(requesterId, managers);
            if (chain.Contains(approverId)) return (true, null);

            foreach (var delegation in await _delegationRepository.GetActiveForDelegateAsync(approverId, _today()))
            {
                if (chain.Contains(delegation.DelegatorEmployeeID))
                {
                    return (true, delegation.DelegatorEmployeeID);
                }
            }

            return (false, null);
        }

        /// <summary>
        /// Applies a decision to a request, recording who made it and when.
        /// Only a Pending request can be decided — re-approving or flipping a settled
        /// request is rejected rather than silently overwriting the audit trail.
        /// </summary>
        private async Task DecideAsync(
            Guid id, string newStatus, Guid? approverEmployeeId, string reason, bool approverIsAdmin)
        {
            var request = await _repository.GetByIdAsync(id);
            if (request == null) throw new ArgumentException("Leave request not found");

            if (!string.Equals(request.Status, StatusPending, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"This request is already {request.Status.ToLowerInvariant()} and cannot be changed.");
            }

            Guid? onBehalfOf = null;
            if (approverEmployeeId.HasValue)
            {
                var approver = await _employeeRepository.GetByIdAsync(approverEmployeeId.Value);
                if (approver == null) throw new ArgumentException("Approver not found");

                if (approver.EmployeeID == request.EmployeeID)
                {
                    throw new InvalidOperationException("You cannot decide your own leave request.");
                }

                // Authority comes from the org chart, not just from holding a token: an
                // admin, anyone above the requester in the reporting line, or someone
                // covering for one of those managers under an active delegation.
                var (allowed, behalfOf) = await ResolveAuthorityAsync(approver.EmployeeID, request.EmployeeID, approverIsAdmin);
                if (!allowed)
                {
                    throw new UnauthorizedAccessException(
                        "Only a manager in this employee's reporting line, someone covering for them, or an administrator can decide this request.");
                }
                onBehalfOf = behalfOf;
            }

            request.DecidedOnBehalfOfEmployeeID = onBehalfOf;
            request.Status = newStatus;
            request.ApprovedByEmployeeID = approverEmployeeId;
            request.DecisionAt = DateTime.UtcNow;
            request.DecisionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();

            await _repository.UpdateAsync(request);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        private LeaveRequestResponseDto MapToDto(LeaveRequest request)
        {
            return new LeaveRequestResponseDto
            {
                RequestID = request.RequestID,
                EmployeeID = request.EmployeeID,
                EmployeeName = $"{request.Employee?.FirstName} {request.Employee?.LastName}",
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                LeaveType = request.LeaveType,
                Status = request.Status,
                CreatedAt = request.CreatedAt,
                ApprovedByEmployeeID = request.ApprovedByEmployeeID,
                ApprovedByName = request.ApprovedBy != null
                    ? $"{request.ApprovedBy.FirstName} {request.ApprovedBy.LastName}"
                    : null,
                DecisionAt = request.DecisionAt,
                DecisionReason = request.DecisionReason,
                DecidedOnBehalfOfEmployeeID = request.DecidedOnBehalfOfEmployeeID,
                DecidedOnBehalfOfName = request.DecidedOnBehalfOf != null
                    ? $"{request.DecidedOnBehalfOf.FirstName} {request.DecidedOnBehalfOf.LastName}"
                    : null
            };
        }
    }
}
