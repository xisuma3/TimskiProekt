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
                .Where(e => !e.IsDeleted)
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .ToListAsync();
        }

        public async Task<Employee> GetByIdAsync(Guid id)
        {
            return await _context.Employees
                .Where(e => !e.IsDeleted)
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .Include(e => e.Assets)
                .Include(e => e.GeneratedDocuments)
                .Include(e => e.LeaveRequests)
                .FirstOrDefaultAsync(e => e.EmployeeID == id);
        }

        public async Task<Employee> GetForDocumentProcessingAsync(Guid id)
        {
            return await _context.Employees
                .Where(e => !e.IsDeleted)
                .Include(e => e.Department)
                .Include(e => e.EmployeeDossier)
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

        /// <summary>
        /// Retires an employee without destroying history. Their leave decisions, asset
        /// custody and signed documents stay queryable; the row simply drops out of the
        /// reads above. The FKs from those tables are Restrict, so even a hard delete
        /// could not take them with it.
        /// </summary>
        public async Task DeleteAsync(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee != null && !employee.IsDeleted)
            {
                employee.IsDeleted = true;
                employee.DeletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Includes retired employees. Used where history must stay attributable — for
        /// example naming the employee on a document generated before they left.
        /// </summary>
        public async Task<Employee> GetByIdIncludingDeletedAsync(Guid id)
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

        /// <summary>
        /// Irreversibly destroys an employee's personal data while keeping the employment
        /// records an employer is obliged to retain.
        ///
        /// Erased: name, email, position, the login, the dossier (birth date, address,
        /// emergency contact) and the rendered body of every generated document, which
        /// embeds those same fields.
        ///
        /// Kept: leave decisions and asset custody. Those are records of what the company
        /// did and what happened to company property; they stay attributable to an
        /// anonymous employee id rather than being deleted outright. The row itself
        /// survives so those foreign keys stay valid.
        /// </summary>
        public async Task EraseAsync(Guid id)
        {
            var employee = await _context.Employees
                .Include(e => e.EmployeeDossier)
                .Include(e => e.GeneratedDocuments)
                .FirstOrDefaultAsync(e => e.EmployeeID == id);

            if (employee == null || employee.IsErased) return;

            // The dossier is nothing but personal data.
            if (employee.EmployeeDossier != null)
            {
                _context.EmployeeDossiers.Remove(employee.EmployeeDossier);
            }

            // Document bodies carry the name, address and dossier fields verbatim. The row
            // stays so the audit trail still shows a document was issued, and when.
            foreach (var document in employee.GeneratedDocuments ?? new List<GeneratedDocument>())
            {
                document.Content = "[erased]";
                document.AssetIDs = null;
            }

            // Drop the login. Detach it first so the FK does not block the delete.
            var applicationUserId = employee.ApplicationUserId;
            employee.ApplicationUserId = null;

            if (!string.IsNullOrEmpty(applicationUserId))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == applicationUserId);
                if (user != null) _context.Users.Remove(user);
            }

            employee.FirstName = "Erased";
            employee.LastName = "Employee";
            employee.Email = null;
            employee.Position = null;
            employee.IsErased = true;
            employee.ErasedAt = DateTime.UtcNow;
            employee.IsDeleted = true;
            employee.DeletedAt ??= DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task RestoreAsync(Guid id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee != null && employee.IsDeleted)
            {
                employee.IsDeleted = false;
                employee.DeletedAt = null;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<Employee> GetByApplicationUserIdAsync(string applicationUserId)
        {
            return await _context.Employees
                .Where(e => !e.IsDeleted)
                .Include(e => e.Department)
                .Include(e => e.Manager)
                .Include(e => e.Mentor)
                .Include(e => e.Assets)
                .Include(e => e.GeneratedDocuments)
                .Include(e => e.LeaveRequests)
                .FirstOrDefaultAsync(e => e.ApplicationUserId == applicationUserId);
        }

        public async Task<Employee> GetByApplicationUserIdIncludingDeletedAsync(string applicationUserId)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(e => e.ApplicationUserId == applicationUserId);
        }
    }
}
