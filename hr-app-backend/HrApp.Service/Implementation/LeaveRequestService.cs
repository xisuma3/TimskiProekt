using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class LeaveRequestService : ILeaveRequestService
    {
        private const string StatusPending = "Pending";
        private const string StatusApproved = "Approved";
        private const string StatusRejected = "Rejected";

        private static readonly HashSet<string> AllowedLeaveTypes =
            new(StringComparer.OrdinalIgnoreCase) { "Vacation", "Sick", "Parental", "Unpaid" };

        private readonly ILeaveRequestRepository _repository;
        private readonly IEmployeeRepository _employeeRepository;

        public LeaveRequestService(
            ILeaveRequestRepository repository,
            IEmployeeRepository employeeRepository)
        {
            _repository = repository;
            _employeeRepository = employeeRepository;
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetAllAsync()
        {
            var requests = await _repository.GetAllAsync();
            return requests.Select(MapToDto);
        }

        public async Task<LeaveRequestResponseDto> GetByIdAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id);
            return request == null ? null : MapToDto(request);
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetByEmployeeIdAsync(Guid employeeId)
        {
            var requests = await _repository.GetByEmployeeIdAsync(employeeId);
            return requests.Select(MapToDto);
        }

        public async Task<IEnumerable<LeaveRequestResponseDto>> GetPendingRequestsAsync()
        {
            var requests = await _repository.GetPendingRequestsAsync();
            return requests.Select(MapToDto);
        }

        public async Task<LeaveRequestResponseDto> CreateAsync(LeaveRequestRequestDto dto)
        {
            var startDate = dto.StartDate.Date;
            var endDate = dto.EndDate.Date;

            if (endDate < startDate)
            {
                throw new ArgumentException("End date must be on or after start date");
            }

            if (string.IsNullOrWhiteSpace(dto.LeaveType) || !AllowedLeaveTypes.Contains(dto.LeaveType))
            {
                throw new ArgumentException(
                    $"Leave type must be one of: {string.Join(", ", AllowedLeaveTypes)}");
            }

            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null)
            {
                throw new ArgumentException("Employee not found");
            }

            // Stop the same days being booked twice. Rejected requests don't count.
            var overlapping = await _repository.GetOverlappingAsync(dto.EmployeeID, startDate, endDate);
            if (overlapping.Any())
            {
                var clash = overlapping.First();
                throw new ArgumentException(
                    $"This overlaps an existing {clash.Status.ToLowerInvariant()} request " +
                    $"({clash.StartDate:yyyy-MM-dd} to {clash.EndDate:yyyy-MM-dd})");
            }

            var leaveRequest = new LeaveRequest
            {
                EmployeeID = dto.EmployeeID,
                StartDate = startDate,
                EndDate = endDate,
                LeaveType = dto.LeaveType,
                Status = StatusPending,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.AddAsync(leaveRequest);
            return await GetByIdAsync(created.RequestID);
        }

        public Task ApproveRequestAsync(Guid id, Guid? approverEmployeeId, string reason) =>
            DecideAsync(id, StatusApproved, approverEmployeeId, reason);

        public Task RejectRequestAsync(Guid id, Guid? approverEmployeeId, string reason) =>
            DecideAsync(id, StatusRejected, approverEmployeeId, reason);

        /// <summary>
        /// Applies a decision to a request, recording who made it and when.
        /// Only a Pending request can be decided — re-approving or flipping a settled
        /// request is rejected rather than silently overwriting the audit trail.
        /// </summary>
        private async Task DecideAsync(Guid id, string newStatus, Guid? approverEmployeeId, string reason)
        {
            var request = await _repository.GetByIdAsync(id);
            if (request == null) throw new ArgumentException("Leave request not found");

            if (!string.Equals(request.Status, StatusPending, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"This request is already {request.Status.ToLowerInvariant()} and cannot be changed.");
            }

            if (approverEmployeeId.HasValue)
            {
                var approver = await _employeeRepository.GetByIdAsync(approverEmployeeId.Value);
                if (approver == null) throw new ArgumentException("Approver not found");

                if (approver.EmployeeID == request.EmployeeID)
                {
                    throw new InvalidOperationException("You cannot decide your own leave request.");
                }
            }

            request.Status = newStatus;
            request.ApprovedByEmployeeID = approverEmployeeId;
            request.DecisionAt = DateTime.UtcNow;
            request.DecisionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();

            await _repository.UpdateAsync(request);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        private LeaveRequestResponseDto MapToDto(LeaveRequest request)
        {
            return new LeaveRequestResponseDto
            {
                RequestID = request.RequestID,
                EmployeeID = request.EmployeeID,
                EmployeeName = $"{request.Employee?.FirstName} {request.Employee?.LastName}",
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                LeaveType = request.LeaveType,
                Status = request.Status,
                CreatedAt = request.CreatedAt,
                ApprovedByEmployeeID = request.ApprovedByEmployeeID,
                ApprovedByName = request.ApprovedBy != null
                    ? $"{request.ApprovedBy.FirstName} {request.ApprovedBy.LastName}"
                    : null,
                DecisionAt = request.DecisionAt,
                DecisionReason = request.DecisionReason
            };
        }
    }
}
