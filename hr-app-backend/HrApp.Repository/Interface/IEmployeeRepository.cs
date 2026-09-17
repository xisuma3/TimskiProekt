using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Repository.Interface
{
    public interface IEmployeeRepository
    {
        Task<IEnumerable<Employee>> GetAllAsync();
        Task<Employee> GetByIdAsync(Guid id);
        Task<Employee> GetByApplicationUserIdAsync(string applicationUserId);
        Task<Employee> AddAsync(Employee employee);
        Task UpdateAsync(Employee employee);
        Task DeleteAsync(Guid id);
        Task<Employee> GetByIdIncludingDeletedAsync(Guid id);
        Task RestoreAsync(Guid id);
    }
}
