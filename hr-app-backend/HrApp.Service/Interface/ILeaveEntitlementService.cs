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

        /// <summary>Standing for one employee/year/type. Untracked types are uncapped.</summary>
        Task<LeaveBalanceResponseDto> GetBalanceAsync(Guid employeeId, int year, string leaveType);

        /// <summary>Standing across every leave type for one employee/year.</summary>
        Task<IEnumerable<LeaveBalanceResponseDto>> GetBalancesAsync(Guid employeeId, int year);
    }
}
