using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HrApp.Repository.Interface
{
    public interface ILeaveEntitlementRepository
    {
        Task<IEnumerable<LeaveEntitlement>> GetAllAsync();
        Task<LeaveEntitlement> GetByIdAsync(Guid id);
        Task<IEnumerable<LeaveEntitlement>> GetByEmployeeIdAsync(Guid employeeId, int? year = null);

        /// <summary>The allowance governing one employee/year/type, or null when uncapped.</summary>
        Task<LeaveEntitlement> GetForAsync(Guid employeeId, int year, string leaveType);

        Task<LeaveEntitlement> AddAsync(LeaveEntitlement entitlement);
        Task UpdateAsync(LeaveEntitlement entitlement);
        Task DeleteAsync(Guid id);
    }
}
