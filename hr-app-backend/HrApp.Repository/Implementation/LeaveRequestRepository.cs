using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrAppWebApplication;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Repository.Implementation
{
    public class LeaveRequestRepository : ILeaveRequestRepository
    {
        private readonly HrAppDbContext _context;

        public LeaveRequestRepository(HrAppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<LeaveRequest>> GetAllAsync()
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<LeaveRequest> GetByIdAsync(Guid id)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .FirstOrDefaultAsync(lr => lr.RequestID == id);
        }

        public async Task<IEnumerable<LeaveRequest>> GetByEmployeeIdAsync(Guid employeeId)
        {
            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeID == employeeId)
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .OrderByDescending(lr => lr.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingRequestsAsync()
        {
            return await _context.LeaveRequests
                .Where(lr => lr.Status == "Pending")
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .OrderBy(lr => lr.CreatedAt)
                .ToListAsync();
        }

        // Any request for the same employee whose date range intersects [start, end] and
        // that has not been rejected. Used to stop double-booking the same days.
        public async Task<IEnumerable<LeaveRequest>> GetOverlappingAsync(
            Guid employeeId, DateTime startDate, DateTime endDate, Guid? excludeRequestId = null)
        {
            var query = _context.LeaveRequests
                .Where(lr => lr.EmployeeID == employeeId
                             && lr.Status != "Rejected"
                             && lr.StartDate <= endDate
                             && lr.EndDate >= startDate);

            if (excludeRequestId.HasValue)
                query = query.Where(lr => lr.RequestID != excludeRequestId.Value);

            return await query.ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetForManagerAsync(Guid managerEmployeeId, bool pendingOnly = false)
        {
            var query = _context.LeaveRequests
                .Where(lr => lr.Employee.ManagerID == managerEmployeeId && !lr.Employee.IsDeleted)
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .AsQueryable();

            if (pendingOnly) query = query.Where(lr => lr.Status == "Pending");

            return await query.OrderByDescending(lr => lr.CreatedAt).ToListAsync();
        }

        // Requests filed by any of the given employees (retired requesters excluded) —
        // backs the "requests I can decide" view once authority is worked out in the service.
        public async Task<IEnumerable<LeaveRequest>> GetForEmployeesAsync(IReadOnlyCollection<Guid> employeeIds, bool pendingOnly = false)
        {
            if (employeeIds.Count == 0) return new List<LeaveRequest>();

            var query = _context.LeaveRequests
                .Where(lr => employeeIds.Contains(lr.EmployeeID) && !lr.Employee.IsDeleted)
                .Include(lr => lr.Employee)
                .Include(lr => lr.ApprovedBy)
                .Include(lr => lr.DecidedOnBehalfOf)
                .AsQueryable();

            if (pendingOnly) query = query.Where(lr => lr.Status == "Pending");

            return await query.OrderByDescending(lr => lr.CreatedAt).ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetTouchingYearAsync(Guid employeeId, int year, string leaveType)
        {
            var yearStart = new DateTime(year, 1, 1);
            var yearEnd = new DateTime(year, 12, 31);

            return await _context.LeaveRequests
                .Where(lr => lr.EmployeeID == employeeId
                             && lr.LeaveType == leaveType
                             && lr.Status != "Rejected"
                             && lr.StartDate <= yearEnd
                             && lr.EndDate >= yearStart)
                .ToListAsync();
        }

        public async Task<LeaveRequest> AddAsync(LeaveRequest leaveRequest)
        {
            leaveRequest.CreatedAt = DateTime.UtcNow;
            leaveRequest.Status = "Pending"; // Default status

            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();
            return leaveRequest;
        }

        public async Task UpdateAsync(LeaveRequest leaveRequest)
        {
            _context.Entry(leaveRequest).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest != null)
            {
                _context.LeaveRequests.Remove(leaveRequest);
                await _context.SaveChangesAsync();
            }
        }
    }
}
