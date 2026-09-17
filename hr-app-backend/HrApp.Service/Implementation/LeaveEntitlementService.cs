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

        public LeaveEntitlementService(
            ILeaveEntitlementRepository repository,
            ILeaveRequestRepository leaveRequestRepository,
            IEmployeeRepository employeeRepository)
        {
            _repository = repository;
            _leaveRequestRepository = leaveRequestRepository;
            _employeeRepository = employeeRepository;
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
                DaysCarriedOver = dto.DaysCarriedOver
            });

            return await GetByIdAsync(created.EntitlementID);
        }

        public async Task UpdateAsync(Guid id, LeaveEntitlementRequestDto dto)
        {
            var entitlement = await _repository.GetByIdAsync(id);
            if (entitlement == null) throw new ArgumentException("Entitlement not found");

            GuardLeaveType(dto.LeaveType);

            // Reducing an allowance below what is already committed would produce a
            // negative balance that nobody can act on.
            var balance = await GetBalanceAsync(entitlement.EmployeeID, entitlement.Year, dto.LeaveType);
            var newTotal = dto.DaysAllocated + dto.DaysCarriedOver;
            if (newTotal < balance.DaysCommitted)
            {
                throw new InvalidOperationException(
                    $"Cannot reduce the allowance to {newTotal} days: {balance.DaysCommitted} are already approved or pending.");
            }

            entitlement.Year = dto.Year;
            entitlement.LeaveType = dto.LeaveType;
            entitlement.DaysAllocated = dto.DaysAllocated;
            entitlement.DaysCarriedOver = dto.DaysCarriedOver;

            await _repository.UpdateAsync(entitlement);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        /// <summary>
        /// Standing for one employee/year/type. When no entitlement row exists the type is
        /// uncapped (<see cref="LeaveBalanceResponseDto.IsTracked"/> false) — an absent row
        /// means "not capped here", not "zero days".
        /// </summary>
        public async Task<LeaveBalanceResponseDto> GetBalanceAsync(Guid employeeId, int year, string leaveType)
        {
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
                DaysApproved = approved,
                DaysPending = pending
            };
        }

        public async Task<IEnumerable<LeaveBalanceResponseDto>> GetBalancesAsync(Guid employeeId, int year)
        {
            var balances = new List<LeaveBalanceResponseDto>();
            foreach (var type in LeaveTypes)
            {
                balances.Add(await GetBalanceAsync(employeeId, year, type));
            }
            return balances;
        }

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
                DaysCarriedOver = entitlement.DaysCarriedOver
            };
        }
    }
}
