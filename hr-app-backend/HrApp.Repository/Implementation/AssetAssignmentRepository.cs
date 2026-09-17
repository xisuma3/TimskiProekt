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
    public class AssetAssignmentRepository : IAssetAssignmentRepository
    {
        private readonly HrAppDbContext _context;

        public AssetAssignmentRepository(HrAppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AssetAssignment>> GetByAssetIdAsync(Guid assetId)
        {
            return await _context.AssetAssignments
                .Where(a => a.AssetID == assetId)
                .Include(a => a.Asset)
                .Include(a => a.Employee)
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<AssetAssignment>> GetByEmployeeIdAsync(Guid employeeId)
        {
            return await _context.AssetAssignments
                .Where(a => a.EmployeeID == employeeId)
                .Include(a => a.Asset)
                .Include(a => a.Employee)
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync();
        }

        public async Task<AssetAssignment> GetOpenForAssetAsync(Guid assetId)
        {
            return await _context.AssetAssignments
                .Include(a => a.Asset)
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.AssetID == assetId && a.ReturnedDate == null);
        }

        public async Task<AssetAssignment> AddAsync(AssetAssignment assignment)
        {
            _context.AssetAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        public async Task UpdateAsync(AssetAssignment assignment)
        {
            _context.Entry(assignment).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }
    }
}
