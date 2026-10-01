using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HrApp.Repository.Interface
{
    public interface IApprovalDelegationRepository
    {
        Task<ApprovalDelegation> GetByIdAsync(Guid id);
        Task<IEnumerable<ApprovalDelegation>> GetAllAsync();
        /// <summary>Delegations where the employee is either the delegator or the delegate.</summary>
        Task<IEnumerable<ApprovalDelegation>> GetInvolvingAsync(Guid employeeId);
        /// <summary>Non-revoked delegations to this delegate that cover the given day.</summary>
        Task<IEnumerable<ApprovalDelegation>> GetActiveForDelegateAsync(Guid delegateEmployeeId, DateTime day);
        /// <summary>Non-revoked delegations from this delegator overlapping [start, end].</summary>
        Task<IEnumerable<ApprovalDelegation>> GetOverlappingAsync(Guid delegatorEmployeeId, DateTime start, DateTime end);
        Task<ApprovalDelegation> AddAsync(ApprovalDelegation delegation);
        Task UpdateAsync(ApprovalDelegation delegation);
    }
}
