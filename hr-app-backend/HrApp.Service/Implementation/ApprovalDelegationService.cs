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
    /// <summary>
    /// Approval delegation: a manager hands their leave-approval authority to a colleague for
    /// a date range. The delegate then decides anything the delegator could — see
    /// <see cref="LeaveRequestService"/>. Delegations do not chain: a delegate exercises only
    /// the delegator's own authority, never authority delegated to the delegator.
    /// </summary>
    public class ApprovalDelegationService : IApprovalDelegationService
    {
        private readonly IApprovalDelegationRepository _repository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly Func<DateTime> _today;

        public ApprovalDelegationService(
            IApprovalDelegationRepository repository,
            IEmployeeRepository employeeRepository,
            Func<DateTime> today = null)
        {
            _repository = repository;
            _employeeRepository = employeeRepository;
            _today = today ?? (() => DateTime.UtcNow.Date);
        }

        public async Task<IEnumerable<ApprovalDelegationResponseDto>> GetAllAsync() =>
            (await _repository.GetAllAsync()).Select(MapToDto);

        public async Task<IEnumerable<ApprovalDelegationResponseDto>> GetInvolvingAsync(Guid employeeId) =>
            (await _repository.GetInvolvingAsync(employeeId)).Select(MapToDto);

        public async Task<ApprovalDelegationResponseDto> CreateAsync(
            Guid delegatorEmployeeId, Guid createdByEmployeeId, ApprovalDelegationRequestDto dto)
        {
            var start = dto.StartDate.Date;
            var end = dto.EndDate.Date;

            if (end < start) throw new ArgumentException("The end date must be on or after the start date.");
            if (end < _today()) throw new ArgumentException("A delegation can't end in the past.");
            if (dto.DelegateEmployeeID == delegatorEmployeeId)
                throw new ArgumentException("You can't delegate approvals to yourself.");

            var delegator = await _employeeRepository.GetByIdAsync(delegatorEmployeeId);
            if (delegator == null) throw new ArgumentException("The person delegating was not found.");

            // GetByIdAsync excludes retired employees, so a retired delegate is refused here.
            var delegateEmployee = await _employeeRepository.GetByIdAsync(dto.DelegateEmployeeID);
            if (delegateEmployee == null) throw new ArgumentException("The chosen delegate was not found or has left.");

            var overlapping = await _repository.GetOverlappingAsync(delegatorEmployeeId, start, end);
            if (overlapping.Any())
            {
                var clash = overlapping.First();
                throw new InvalidOperationException(
                    $"There is already a delegation covering {clash.StartDate:yyyy-MM-dd} to {clash.EndDate:yyyy-MM-dd}. Revoke it first.");
            }

            var created = await _repository.AddAsync(new ApprovalDelegation
            {
                DelegatorEmployeeID = delegatorEmployeeId,
                DelegateEmployeeID = dto.DelegateEmployeeID,
                StartDate = start,
                EndDate = end,
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                CreatedAt = DateTime.UtcNow,
                CreatedByEmployeeID = createdByEmployeeId,
            });

            return MapToDto(await _repository.GetByIdAsync(created.DelegationID));
        }

        public async Task RevokeAsync(Guid delegationId, Guid callerEmployeeId, bool callerIsAdmin)
        {
            var delegation = await _repository.GetByIdAsync(delegationId);
            if (delegation == null) throw new ArgumentException("Delegation not found.");

            var involved = delegation.DelegatorEmployeeID == callerEmployeeId
                           || delegation.DelegateEmployeeID == callerEmployeeId;
            if (!callerIsAdmin && !involved)
                throw new UnauthorizedAccessException("Only the people in this delegation, or an administrator, can revoke it.");

            if (delegation.RevokedAt != null) throw new InvalidOperationException("This delegation has already been revoked.");
            if (delegation.EndDate.Date < _today()) throw new InvalidOperationException("This delegation has already ended.");

            delegation.RevokedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(delegation);
        }

        private ApprovalDelegationResponseDto MapToDto(ApprovalDelegation d)
        {
            var today = _today();
            var status = d.RevokedAt != null ? "Revoked"
                : d.EndDate.Date < today ? "Ended"
                : d.StartDate.Date > today ? "Scheduled"
                : "Active";
            return new ApprovalDelegationResponseDto
            {
                DelegationID = d.DelegationID,
                DelegatorEmployeeID = d.DelegatorEmployeeID,
                DelegatorName = d.Delegator == null ? null : $"{d.Delegator.FirstName} {d.Delegator.LastName}",
                DelegateEmployeeID = d.DelegateEmployeeID,
                DelegateName = d.Delegate == null ? null : $"{d.Delegate.FirstName} {d.Delegate.LastName}",
                StartDate = d.StartDate,
                EndDate = d.EndDate,
                Note = d.Note,
                CreatedAt = d.CreatedAt,
                RevokedAt = d.RevokedAt,
                Status = status,
            };
        }
    }
}
