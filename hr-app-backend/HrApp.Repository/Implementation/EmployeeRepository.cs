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
    public class EmployeeRepository : IEmployeeRepository
    {
        private readonly HrAppDbContext _context;

        public EmployeeRepository(HrAppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Employee>> GetAllAsync()
        {
            return await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .ToListAsync();
        }

        public async Task<Employee> GetByIdAsync(Guid id)
        {
            return await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .Include(e => e.Assets)
                .Include(e => e.GeneratedDocuments)
                .Include(e => e.LeaveRequests)
                .FirstOrDefaultAsync(e => e.EmployeeID == id);
        }

        public async Task<Employee> AddAsync(Employee employee)
        {
            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task UpdateAsync(Employee employee)
        {
            _context.Entry(employee).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee != null)
            {
                _context.Employees.Remove(employee);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<Employee> GetByApplicationUserIdAsync(string applicationUserId)
        {
            return await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .Include(e => e.Assets)
                .Include(e => e.GeneratedDocuments)
                .Include(e => e.LeaveRequests)
                .FirstOrDefaultAsync(e => e.ApplicationUserId == applicationUserId);
        }
    }
}
