using HrApp.Repository.Interface;
using HrApp.Service.Interface;

namespace HrApp.Service.Implementation
{
    public class EmployeeAccountStatusValidator : IEmployeeAccountStatusValidator
    {
        private readonly IEmployeeRepository _employeeRepository;

        public EmployeeAccountStatusValidator(IEmployeeRepository employeeRepository)
        {
            _employeeRepository = employeeRepository;
        }

        public async Task<bool> CanAuthenticateAsync(string? applicationUserId)
        {
            if (string.IsNullOrWhiteSpace(applicationUserId)) return false;

            var employee = await _employeeRepository.GetByApplicationUserIdIncludingDeletedAsync(applicationUserId);
            return employee != null && !employee.IsDeleted && !employee.IsErased;
        }
    }
}
