using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Repository.Interface
{
    public interface ILeaveRequestRepository
    {
        Task<IEnumerable<LeaveRequest>> GetAllAsync();
        Task<LeaveRequest> GetByIdAsync(Guid id);
        Task<IEnumerable<LeaveRequest>> GetByEmployeeIdAsync(Guid employeeId);
        Task<IEnumerable<LeaveRequest>> GetPendingRequestsAsync();

        /// <summary>Requests filed by anyone reporting to this manager.</summary>
        Task<IEnumerable<LeaveRequest>> GetForManagerAsync(Guid managerEmployeeId, bool pendingOnly = false);
        Task<IEnumerable<LeaveRequest>> GetOverlappingAsync(
            Guid employeeId, DateTime startDate, DateTime endDate, Guid? excludeRequestId = null);

        /// <summary>
        /// Requests of one type that touch a calendar year at all. A request may straddle
        /// New Year, so the caller apportions days between years rather than assuming a
        /// request belongs wholly to one.
        /// </summary>
        Task<IEnumerable<LeaveRequest>> GetTouchingYearAsync(Guid employeeId, int year, string leaveType);
        Task<LeaveRequest> AddAsync(LeaveRequest leaveRequest);
        Task UpdateAsync(LeaveRequest leaveRequest);
        Task DeleteAsync(Guid id);
    }
}
