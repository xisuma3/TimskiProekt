using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class LeaveEntitlementService : ILeaveEntitlementService
    {
        public static readonly string[] LeaveTypes = { "Vacation", "Sick", "Parental", "Unpaid" };

        private readonly ILeaveEntitlementRepository _repository;
        private readonly ILeaveRequestRepository _leaveRequestRepository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly Func<DateTime> _today;

        public LeaveEntitlementService(
            ILeaveEntitlementRepository repository,
            ILeaveRequestRepository leaveRequestRepository,
            IEmployeeRepository employeeRepository,
            Func<DateTime> today = null)
        {
            _repository = repository;
            _leaveRequestRepository = leaveRequestRepository;
            _employeeRepository = employeeRepository;
            _today = today ?? (() => DateTime.UtcNow.Date);
        }

        public async Task<IEnumerable<LeaveEntitlementResponseDto>> GetAllAsync()
        {
            var entitlements = await _repository.GetAllAsync();
            return entitlements.Select(MapToDto);
        }

        public async Task<LeaveEntitlementResponseDto> GetByIdAsync(Guid id)
        {
            var entitlement = await _repository.GetByIdAsync(id);
            return entitlement == null ? null : MapToDto(entitlement);
        }

        public async Task<IEnumerable<LeaveEntitlementResponseDto>> GetByEmployeeIdAsync(Guid employeeId, int? year = null)
        {
            var entitlements = await _repository.GetByEmployeeIdAsync(employeeId, year);
            return entitlements.Select(MapToDto);
        }

        public async Task<LeaveEntitlementResponseDto> CreateAsync(LeaveEntitlementRequestDto dto)
        {
            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null) throw new ArgumentException("Employee not found");

            GuardLeaveType(dto.LeaveType);
            GuardDays(dto);

            var existing = await _repository.GetForAsync(dto.EmployeeID, dto.Year, dto.LeaveType);
            if (existing != null)
                throw new InvalidOperationException(
                    $"{employee.FirstName} {employee.LastName} already has a {dto.LeaveType} allowance for {dto.Year}. Edit it instead.");

            var created = await _repository.AddAsync(new LeaveEntitlement
            {
                EmployeeID = dto.EmployeeID,
                Year = dto.Year,
                LeaveType = dto.LeaveType,
                DaysAllocated = dto.DaysAllocated,
                DaysCarriedOver = dto.DaysCarriedOver,
                AccrualMethod = NormalizeAccrual(dto.AccrualMethod)
            });

            return await GetByIdAsync(created.EntitlementID);
        }

        public async Task UpdateAsync(Guid id, LeaveEntitlementRequestDto dto)
        {
            var entitlement = await _repository.GetByIdAsync(id);
            if (entitlement == null) throw new ArgumentException("Entitlement not found");

            GuardLeaveType(dto.LeaveType);
            GuardDays(dto);

            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null) throw new ArgumentException("Employee not found");

            var duplicate = await _repository.GetForAsync(dto.EmployeeID, dto.Year, dto.LeaveType);
            if (duplicate != null && duplicate.EntitlementID != id)
            {
                throw new InvalidOperationException(
                    $"{employee.FirstName} {employee.LastName} already has a {dto.LeaveType} allowance for {dto.Year}. Edit it instead.");
            }

            // Reducing an allowance below what is already committed would produce a
            // negative balance that nobody can act on.
            var balance = await GetBalanceAsync(dto.EmployeeID, dto.Year, dto.LeaveType);
            var newTotal = dto.DaysAllocated + dto.DaysCarriedOver;
            if (newTotal < balance.DaysCommitted)
            {
                throw new InvalidOperationException(
                    $"Cannot reduce the allowance to {newTotal} days: {balance.DaysCommitted} are already approved or pending.");
            }

            entitlement.EmployeeID = dto.EmployeeID;
            entitlement.Year = dto.Year;
            entitlement.LeaveType = dto.LeaveType;
            entitlement.DaysAllocated = dto.DaysAllocated;
            entitlement.DaysCarriedOver = dto.DaysCarriedOver;
            entitlement.AccrualMethod = NormalizeAccrual(dto.AccrualMethod);

            await _repository.UpdateAsync(entitlement);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        /// <summary>
        /// Standing for one employee/year/type. When no entitlement row exists,
        /// <see cref="LeaveBalanceResponseDto.IsTracked"/> is false: there is no allowance,
        /// and LeaveRequestService refuses requests of that type for that year.
        /// </summary>
        public async Task<LeaveBalanceResponseDto> GetBalanceAsync(Guid employeeId, int year, string leaveType, DateTime? asOf = null)
        {
            var asOfDate = (asOf ?? _today()).Date;
            var employee = await _employeeRepository.GetByIdAsync(employeeId);
            var entitlement = await _repository.GetForAsync(employeeId, year, leaveType);
            var requests = await _leaveRequestRepository.GetTouchingYearAsync(employeeId, year, leaveType);

            decimal approved = 0, pending = 0;
            foreach (var request in requests)
            {
                var days = DaysWithinYear(request, year);
                if (days == 0) continue;

                if (string.Equals(request.Status, "Approved", StringComparison.OrdinalIgnoreCase)) approved += days;
                else if (string.Equals(request.Status, "Pending", StringComparison.OrdinalIgnoreCase)) pending += days;
            }

            return new LeaveBalanceResponseDto
            {
                EmployeeID = employeeId,
                EmployeeName = employee == null ? null : $"{employee.FirstName} {employee.LastName}",
                Year = year,
                LeaveType = leaveType,
                IsTracked = entitlement != null,
                DaysAllocated = entitlement?.DaysAllocated ?? 0,
                DaysCarriedOver = entitlement?.DaysCarriedOver ?? 0,
                AccrualMethod = entitlement?.AccrualMethod ?? LeaveEntitlement.AccrualUpfront,
                AsOf = asOfDate,
                DaysAccrued = entitlement == null ? 0 : AccruedDays(entitlement, year, asOfDate),
                DaysApproved = approved,
                DaysPending = pending
            };
        }

        public async Task<IEnumerable<LeaveBalanceResponseDto>> GetBalancesAsync(Guid employeeId, int year, DateTime? asOf = null)
        {
            var balances = new List<LeaveBalanceResponseDto>();
            foreach (var type in LeaveTypes)
            {
                balances.Add(await GetBalanceAsync(employeeId, year, type, asOf));
            }
            return balances;
        }

        /// <summary>
        /// How much of an allocation has accrued by <paramref name="asOf"/>. Upfront: all of
        /// it. Monthly: 1/12 for every month of <paramref name="year"/> that has started —
        /// none before the year, all of it after. Rounded to two places.
        /// </summary>
        public static decimal AccruedDays(LeaveEntitlement entitlement, int year, DateTime asOf)
        {
            if (!string.Equals(entitlement.AccrualMethod, LeaveEntitlement.AccrualMonthly, StringComparison.OrdinalIgnoreCase))
                return entitlement.DaysAllocated;

            var months = asOf.Year < year ? 0 : asOf.Year > year ? 12 : asOf.Month;
            return Math.Round(entitlement.DaysAllocated * months / 12m, 2);
        }

        /// <summary>
        /// Year-end carry-over. For each allowance in the source year, unused days
        /// (full-year entitlement minus approved and pending days) carry into next year's
        /// allowance, capped. Re-running is idempotent: it sets next year's carry-over rather
        /// than adding to it. A missing next-year allowance is created with the same
        /// allocation and accrual method.
        /// </summary>
        public async Task<IEnumerable<CarryOverResultDto>> CarryOverAsync(CarryOverRequestDto request)
        {
            if (request.MaxDays < 0) throw new ArgumentException("The carry-over cap can't be negative.");

            var types = (request.LeaveTypes == null || request.LeaveTypes.Count == 0)
                ? new List<string> { "Vacation" }
                : request.LeaveTypes;
            foreach (var t in types) GuardLeaveType(t);

            var toYear = request.FromYear + 1;
            var results = new List<CarryOverResultDto>();

            var source = (await _repository.GetByYearAsync(request.FromYear))
                .Where(e => types.Contains(e.LeaveType, StringComparer.OrdinalIgnoreCase))
                .OrderBy(e => e.Employee?.LastName).ThenBy(e => e.Employee?.FirstName);

            foreach (var entitlement in source)
            {
                // End of year: everything has accrued, so use the full-year balance.
                var balance = await GetBalanceAsync(entitlement.EmployeeID, request.FromYear, entitlement.LeaveType,
                    new DateTime(request.FromYear, 12, 31));
                var unused = Math.Max(0, balance.TotalAvailable - balance.DaysCommitted);
                var carry = Math.Min(unused, request.MaxDays);

                var result = new CarryOverResultDto
                {
                    EmployeeID = entitlement.EmployeeID,
                    EmployeeName = balance.EmployeeName,
                    LeaveType = entitlement.LeaveType,
                    UnusedDays = unused,
                    CarriedDays = carry,
                };

                var next = await _repository.GetForAsync(entitlement.EmployeeID, toYear, entitlement.LeaveType);
                if (next == null)
                {
                    result.Action = "Created";
                    result.Note = $"New {toYear} allowance of {entitlement.DaysAllocated} days ({entitlement.AccrualMethod.ToLowerInvariant()}).";
                    if (!request.Preview)
                    {
                        await _repository.AddAsync(new LeaveEntitlement
                        {
                            EmployeeID = entitlement.EmployeeID,
                            Year = toYear,
                            LeaveType = entitlement.LeaveType,
                            DaysAllocated = entitlement.DaysAllocated,
                            DaysCarriedOver = carry,
                            AccrualMethod = entitlement.AccrualMethod,
                        });
                    }
                }
                else if (next.DaysCarriedOver == carry)
                {
                    result.Action = "Unchanged";
                }
                else
                {
                    // Lowering a carry-over must not strand days already booked next year.
                    var nextBalance = await GetBalanceAsync(entitlement.EmployeeID, toYear, entitlement.LeaveType, new DateTime(toYear, 12, 31));
                    if (next.DaysAllocated + carry < nextBalance.DaysCommitted)
                    {
                        result.Action = "Skipped";
                        result.Note = $"{nextBalance.DaysCommitted} days are already booked in {toYear}; carrying {carry} would leave too few.";
                    }
                    else
                    {
                        result.Action = "Updated";
                        result.Note = $"Carry-over changed from {next.DaysCarriedOver} to {carry}.";
                        if (!request.Preview)
                        {
                            next.DaysCarriedOver = carry;
                            await _repository.UpdateAsync(next);
                        }
                    }
                }

                results.Add(result);
            }

            return results;
        }

        private static string NormalizeAccrual(string accrual) =>
            string.Equals(accrual, LeaveEntitlement.AccrualMonthly, StringComparison.OrdinalIgnoreCase)
                ? LeaveEntitlement.AccrualMonthly
                : LeaveEntitlement.AccrualUpfront;

        /// <summary>
        /// Days of a request that fall inside one calendar year. A request spanning New Year
        /// is split across both years rather than counted wholly against either.
        /// </summary>
        public static int DaysWithinYear(LeaveRequest request, int year)
        {
            var yearStart = new DateTime(year, 1, 1);
            var yearEnd = new DateTime(year, 12, 31);

            var start = request.StartDate.Date > yearStart ? request.StartDate.Date : yearStart;
            var end = request.EndDate.Date < yearEnd ? request.EndDate.Date : yearEnd;

            return end < start ? 0 : (end - start).Days + 1;
        }

        private static void GuardLeaveType(string leaveType)
        {
            if (!LeaveTypes.Contains(leaveType, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Leave type must be one of: {string.Join(", ", LeaveTypes)}");
        }

        private static void GuardDays(LeaveEntitlementRequestDto dto)
        {
            if (dto.DaysAllocated < 0 || dto.DaysCarriedOver < 0)
                throw new ArgumentException("Allocated and carried-over days cannot be negative.");
        }

        private static LeaveEntitlementResponseDto MapToDto(LeaveEntitlement entitlement)
        {
            return new LeaveEntitlementResponseDto
            {
                EntitlementID = entitlement.EntitlementID,
                EmployeeID = entitlement.EmployeeID,
                EmployeeName = entitlement.Employee == null
                    ? null
                    : $"{entitlement.Employee.FirstName} {entitlement.Employee.LastName}",
                Year = entitlement.Year,
                LeaveType = entitlement.LeaveType,
                DaysAllocated = entitlement.DaysAllocated,
                DaysCarriedOver = entitlement.DaysCarriedOver,
                AccrualMethod = entitlement.AccrualMethod
            };
        }
    }
}
