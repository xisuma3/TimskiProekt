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
    public class ApprovalDelegationRepository : IApprovalDelegationRepository
    {
        private readonly HrAppDbContext _context;

        public ApprovalDelegationRepository(HrAppDbContext context)
        {
            _context = context;
        }

        private IQueryable<ApprovalDelegation> WithPeople() =>
            _context.ApprovalDelegations
                .Include(d => d.Delegator)
                .Include(d => d.Delegate);

        public async Task<ApprovalDelegation> GetByIdAsync(Guid id) =>
            await WithPeople().FirstOrDefaultAsync(d => d.DelegationID == id);

        public async Task<IEnumerable<ApprovalDelegation>> GetAllAsync() =>
            await WithPeople().OrderByDescending(d => d.StartDate).ToListAsync();

        public async Task<IEnumerable<ApprovalDelegation>> GetInvolvingAsync(Guid employeeId) =>
            await WithPeople()
                .Where(d => d.DelegatorEmployeeID == employeeId || d.DelegateEmployeeID == employeeId)
                .OrderByDescending(d => d.StartDate)
                .ToListAsync();

        public async Task<IEnumerable<ApprovalDelegation>> GetActiveForDelegateAsync(Guid delegateEmployeeId, DateTime day)
        {
            var date = day.Date;
            return await WithPeople()
                .Where(d => d.DelegateEmployeeID == delegateEmployeeId
                            && d.RevokedAt == null
                            && d.StartDate <= date
                            && d.EndDate >= date)
                .ToListAsync();
        }

        public async Task<IEnumerable<ApprovalDelegation>> GetOverlappingAsync(Guid delegatorEmployeeId, DateTime start, DateTime end)
        {
            var from = start.Date;
            var to = end.Date;
            return await _context.ApprovalDelegations
                .Where(d => d.DelegatorEmployeeID == delegatorEmployeeId
                            && d.RevokedAt == null
                            && d.StartDate <= to
                            && d.EndDate >= from)
                .ToListAsync();
        }

        public async Task<ApprovalDelegation> AddAsync(ApprovalDelegation delegation)
        {
            if (delegation.DelegationID == Guid.Empty) delegation.DelegationID = Guid.NewGuid();
            _context.ApprovalDelegations.Add(delegation);
            await _context.SaveChangesAsync();
            return delegation;
        }

        public async Task UpdateAsync(ApprovalDelegation delegation)
        {
            _context.ApprovalDelegations.Update(delegation);
            await _context.SaveChangesAsync();
        }
    }
}
