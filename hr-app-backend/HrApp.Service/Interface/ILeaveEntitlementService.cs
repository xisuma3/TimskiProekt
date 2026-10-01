using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface ILeaveEntitlementService
    {
        Task<IEnumerable<LeaveEntitlementResponseDto>> GetAllAsync();
        Task<LeaveEntitlementResponseDto> GetByIdAsync(Guid id);
        Task<IEnumerable<LeaveEntitlementResponseDto>> GetByEmployeeIdAsync(Guid employeeId, int? year = null);
        Task<LeaveEntitlementResponseDto> CreateAsync(LeaveEntitlementRequestDto dto);
        Task UpdateAsync(Guid id, LeaveEntitlementRequestDto dto);
        Task DeleteAsync(Guid id);

        /// <summary>Standing for one employee/year/type. Untracked (no allowance) types cannot be requested.</summary>
        /// <summary>Standing as of <paramref name="asOf"/> (default today); monthly accrual is worked out for that date.</summary>
        Task<LeaveBalanceResponseDto> GetBalanceAsync(Guid employeeId, int year, string leaveType, DateTime? asOf = null);

        /// <summary>Standing across every leave type for one employee/year.</summary>
        Task<IEnumerable<LeaveBalanceResponseDto>> GetBalancesAsync(Guid employeeId, int year, DateTime? asOf = null);
        /// <summary>Year-end carry-over into the next year, capped; Preview saves nothing.</summary>
        Task<IEnumerable<CarryOverResultDto>> CarryOverAsync(CarryOverRequestDto request);
    }
}
