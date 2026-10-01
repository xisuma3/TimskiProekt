using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;

namespace HrApp.Service.Implementation
{
    public class DevelopmentAdminEmployeeSeeder
    {
        private readonly IEmployeeRepository _employeeRepository;

        public DevelopmentAdminEmployeeSeeder(IEmployeeRepository employeeRepository)
        {
            _employeeRepository = employeeRepository;
        }

        public async Task EnsureLinkedEmployeeAsync(string applicationUserId, string? email)
        {
            var linkedEmployee = await _employeeRepository.GetByApplicationUserIdIncludingDeletedAsync(applicationUserId);
            if (linkedEmployee != null) return;

            await _employeeRepository.AddAsync(new Employee
            {
                ApplicationUserId = applicationUserId,
                FirstName = "System",
                LastName = "Administrator",
                Email = email,
                Position = "HR Administrator",
                HireDate = DateTime.UtcNow.Date
            });
        }
    }
}
