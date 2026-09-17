using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IEmployeeRepository _repository;

        public EmployeeService(IEmployeeRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<EmployeeResponseDto>> GetAllAsync()
        {
            var employees = await _repository.GetAllAsync();
            return employees.Select(e => new EmployeeResponseDto
            {
                EmployeeID = e.EmployeeID,
                ApplicationUserId = e.ApplicationUserId,
                FirstName = e?.FirstName,
                LastName = e?.LastName,
                Email = e?.Email,
                HireDate = e.HireDate,
                Position = e?.Position,
                //DepartmentID = e.DepartmentID?,
                DepartmentName = e?.Department?.Name ?? string.Empty,
                //ManagerID = e.ManagerID,
                ManagerName = e.Manager != null ? $"{e.Manager.FirstName} {e.Manager.LastName}" : null,
                MentorID = e.MentorID,
                MentorName = e.Mentor != null ? $"{e.Mentor.FirstName} {e.Mentor.LastName}" : null
            });
        }

        public async Task<EmployeeResponseDto> GetByIdAsync(Guid id)
        {
            var e = await _repository.GetByIdAsync(id);
            return e == null ? null : MapToDetailDto(e);
        }

        // Resolves the employee behind a signed-in ApplicationUser. This is how the API
        // learns who the caller is; an EmployeeID from a request body must never be used
        // for that, because the caller controls it.
        public async Task<EmployeeResponseDto> GetByApplicationUserIdAsync(string applicationUserId)
        {
            if (string.IsNullOrWhiteSpace(applicationUserId)) return null;

            var e = await _repository.GetByApplicationUserIdAsync(applicationUserId);
            return e == null ? null : MapToDetailDto(e);
        }

        private static EmployeeResponseDto MapToDetailDto(Employee e)
        {
            return new EmployeeResponseDto
            {
                EmployeeID = e.EmployeeID,
                FirstName = e.FirstName,
                LastName = e.LastName,
                Email = e.Email,
                HireDate = e.HireDate,
                Position = e.Position,
                DepartmentID = e.DepartmentID,
                DepartmentName = e.Department?.Name,
                ManagerID = e.ManagerID,
                ManagerName = e.Manager != null ? $"{e.Manager.FirstName} {e.Manager.LastName}" : null,
                MentorID = e.MentorID,
                MentorName = e.Mentor != null ? $"{e.Mentor.FirstName} {e.Mentor.LastName}" : null,
                ApplicationUserId = e.ApplicationUserId,

                Assets = e.Assets?.Select(a => new AssetResponseDto
                {
                    AssetID = a.AssetID,
                    EmployeeID = a.EmployeeID,
                    EmployeeName = $"{e.FirstName} {e.LastName}",
                    Name = a.Name,
                    Description = a.Description,
                    SerialNumber = a.SerialNumber,
                    AssignmentDate = a.AssignmentDate,
                    IsActive = a.IsActive
                }).ToList() ?? [],

                LeaveRequests = e.LeaveRequests?.Select(x => new LeaveRequestResponseDto
                {
                    RequestID = x.RequestID,
                    EmployeeID = x.EmployeeID,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    LeaveType = x.LeaveType,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt

                }).ToList() ?? [],
                // Koga ke se sredat dokumentite togash ke go stavime kodov
                //GeneratedDocuments = e.GeneratedDocuments?.Select(g => new GeneratedDocumentResponseDto
                //{
                //    DocumentID = g.DocumentID,
                //    Content = g.Content,
                //    GeneratedDate = g.GeneratedDate,
                //    TemplateID = g.TemplateID,
                //    TemplateName = g.DocumentTemplate?.TemplateName ?? "",
                //    Assets = e.Assets?.Select(a => new AssetResponseDto
                //    {
                //        AssetID = a.AssetID,
                //        EmployeeID = a.EmployeeID,
                //        EmployeeName = $"{e.FirstName} {e.LastName}",
                //        Name = a.Name,
                //        Description = a.Description,
                //        SerialNumber = a.SerialNumber,
                //        AssignmentDate = a.AssignmentDate,
                //        IsActive = a.IsActive
                //    }).ToList() ?? new List<AssetResponseDto>(),
                //}).ToList() ?? new List<GeneratedDocumentResponseDto>()

            };
        }

        public async Task<EmployeeResponseDto> AddAsync(EmployeeRequestDto dto) //drug dto za ova

        {
            var employee = new Employee
            {
                ApplicationUserId = dto.ApplicationUserId,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                //PasswordHash = dto.PasswordHash,
                HireDate = dto.HireDate,
                Position = dto.Position,
                DepartmentID = dto.DepartmentID,
                ManagerID = dto.ManagerID,
                MentorID = dto.MentorID
            };

            var created = await _repository.AddAsync(employee);
            return await GetByIdAsync(created.EmployeeID);
        }

        public async Task UpdateAsync(Guid id, UpdateEmployeeRequestDto dto)
        {

            var existingEmployee = await _repository.GetByIdAsync(id);
            if (existingEmployee == null) throw new ArgumentException("Employee not found");

            //var employee = new Employee
            //{

            //    EmployeeID = id,
            //    FirstName = dto.FirstName,
            //    LastName = dto.LastName,
            //    Email = dto.Email,
            //    //PasswordHash = dto.PasswordHash,
            //    HireDate = dto.HireDate,
            //    Position = dto?.Position,
            //    DepartmentID = dto?.DepartmentID,
            //    ManagerID = dto?.ManagerID,
            //    MentorID = dto?.MentorID,
            //    ApplicationUserId = existingEmployee.ApplicationUserId
            //};
            
            existingEmployee.FirstName = dto.FirstName;
            existingEmployee.LastName = dto.LastName;
            existingEmployee.Email = dto.Email;
            existingEmployee.HireDate = dto.HireDate;
            existingEmployee.Position = dto.Position;
            existingEmployee.DepartmentID = dto.DepartmentID;
            existingEmployee.ManagerID = dto.ManagerID;
            existingEmployee.MentorID = dto.MentorID;

            await _repository.UpdateAsync(existingEmployee);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        public async Task RestoreAsync(Guid id)
        {
            var employee = await _repository.GetByIdIncludingDeletedAsync(id);
            if (employee == null) throw new ArgumentException("Employee not found");

            await _repository.RestoreAsync(id);
        }

      
    }
}
