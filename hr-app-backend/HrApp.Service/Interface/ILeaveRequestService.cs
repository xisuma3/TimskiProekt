using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface ILeaveRequestService
    {
        Task<IEnumerable<LeaveRequestResponseDto>> GetAllAsync();
        Task<LeaveRequestResponseDto> GetByIdAsync(Guid id);
        Task<IEnumerable<LeaveRequestResponseDto>> GetByEmployeeIdAsync(Guid employeeId);
        Task<IEnumerable<LeaveRequestResponseDto>> GetPendingRequestsAsync();
        Task<LeaveRequestResponseDto> CreateAsync(LeaveRequestRequestDto dto);
        // The approver is always passed explicitly so a decision cannot be recorded
        // anonymously. Controllers resolve it from the caller's token.
        Task ApproveRequestAsync(Guid id, Guid? approverEmployeeId, string reason);
        Task RejectRequestAsync(Guid id, Guid? approverEmployeeId, string reason);

        // approverIsAdmin false means the approver must be the requester's manager.
        Task ApproveRequestAsync(Guid id, Guid? approverEmployeeId, string reason, bool approverIsAdmin);
        Task RejectRequestAsync(Guid id, Guid? approverEmployeeId, string reason, bool approverIsAdmin);

        /// <summary>Requests filed by a manager's direct reports.</summary>
        Task<IEnumerable<LeaveRequestResponseDto>> GetForManagerAsync(Guid managerEmployeeId, bool pendingOnly = false);
        Task DeleteAsync(Guid id);
    }
}
