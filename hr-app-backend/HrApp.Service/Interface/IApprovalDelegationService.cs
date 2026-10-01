using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface IApprovalDelegationService
    {
        Task<IEnumerable<ApprovalDelegationResponseDto>> GetAllAsync();
        /// <summary>Delegations the employee gave or received, newest first.</summary>
        Task<IEnumerable<ApprovalDelegationResponseDto>> GetInvolvingAsync(Guid employeeId);
        /// <summary>
        /// Creates a delegation. <paramref name="delegatorEmployeeId"/> is resolved by the
        /// caller: the token holder for a manager, or the DTO's delegator for an admin.
        /// </summary>
        Task<ApprovalDelegationResponseDto> CreateAsync(Guid delegatorEmployeeId, Guid createdByEmployeeId, ApprovalDelegationRequestDto dto);
        /// <summary>Ends a delegation early. Allowed for the delegator, the delegate (declining) or an admin.</summary>
        Task RevokeAsync(Guid delegationId, Guid callerEmployeeId, bool callerIsAdmin);
    }
}
