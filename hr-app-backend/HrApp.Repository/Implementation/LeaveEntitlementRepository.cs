using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrAppWebApplication;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HrApp.Repository.Implementation
{
    public class LeaveEntitlementRepository : ILeaveEntitlementRepository
    {
        private readonly HrAppDbContext _context;

        public LeaveEntitlementRepository(HrAppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<LeaveEntitlement>> GetAllAsync()
        {
            return await _context.LeaveEntitlements
                .Include(l => l.Employee)
                .OrderByDescending(l => l.Year)
                .ThenBy(l => l.LeaveType)
                .ToListAsync();
        }

        public async Task<LeaveEntitlement> GetByIdAsync(Guid id)
        {
            return await _context.LeaveEntitlements
                .Include(l => l.Employee)
                .FirstOrDefaultAsync(l => l.EntitlementID == id);
        }

        public async Task<IEnumerable<LeaveEntitlement>> GetByEmployeeIdAsync(Guid employeeId, int? year = null)
        {
            var query = _context.LeaveEntitlements
                .Where(l => l.EmployeeID == employeeId)
                .Include(l => l.Employee)
                .AsQueryable();

            if (year.HasValue) query = query.Where(l => l.Year == year.Value);

            return await query
                .OrderByDescending(l => l.Year)
                .ThenBy(l => l.LeaveType)
                .ToListAsync();
        }

        public async Task<LeaveEntitlement> GetForAsync(Guid employeeId, int year, string leaveType)
        {
            return await _context.LeaveEntitlements
                .Include(l => l.Employee)
                .FirstOrDefaultAsync(l => l.EmployeeID == employeeId
                                          && l.Year == year
                                          && l.LeaveType == leaveType);
        }

        public async Task<LeaveEntitlement> AddAsync(LeaveEntitlement entitlement)
        {
            _context.LeaveEntitlements.Add(entitlement);
            await _context.SaveChangesAsync();
            return entitlement;
        }

        public async Task UpdateAsync(LeaveEntitlement entitlement)
        {
            _context.Entry(entitlement).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var entitlement = await _context.LeaveEntitlements.FindAsync(id);
            if (entitlement != null)
            {
                _context.LeaveEntitlements.Remove(entitlement);
                await _context.SaveChangesAsync();
            }
        }
    }
}
