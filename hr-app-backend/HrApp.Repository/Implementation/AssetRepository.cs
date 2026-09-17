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
    public class AssetRepository : IAssetRepository
    {
        private readonly HrAppDbContext _context;

        public AssetRepository(HrAppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Asset>> GetAllAsync()
        {
            return await _context.Assets
                .Include(a => a.Employee)
                .ToListAsync();
        }

        public async Task<Asset> GetByIdAsync(Guid id)
        {
            return await _context.Assets
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.AssetID == id);
        }

        public async Task<Asset> GetBySerialNumberAsync(string serialNumber)
        {
            return await _context.Assets
                .Include(a => a.Employee)
                .FirstOrDefaultAsync(a => a.SerialNumber == serialNumber);
        }

        public async Task<IEnumerable<Asset>> GetByEmployeeIdAsync(Guid employeeId)
        {
            return await _context.Assets
                .Include(a => a.Employee)
                .Where(a => a.EmployeeID == employeeId)
                .ToListAsync();
        }

        public async Task<Asset> AddAsync(Asset asset)
        {
            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();
            return asset;
        }

        public async Task UpdateAsync(Asset asset)
        {
            _context.Entry(asset).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var asset = await _context.Assets.FindAsync(id);
            if (asset != null)
            {
                _context.Assets.Remove(asset);
                await _context.SaveChangesAsync();
            }
        }
    }
}
