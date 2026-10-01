using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface IEmployeeService
    {
        Task<IEnumerable<EmployeeResponseDto>> GetAllAsync();
        Task<EmployeeResponseDto> GetByIdAsync(Guid id);
        Task<EmployeeResponseDto> GetByApplicationUserIdAsync(string applicationUserId);
        Task<EmployeeResponseDto> AddAsync(EmployeeRequestDto dto);
        Task UpdateAsync(Guid id, UpdateEmployeeRequestDto dto);
        Task DeleteAsync(Guid id);
        Task RestoreAsync(Guid id);
        /// <summary>Erases personal data and writes the audit record. The performer comes from the caller's token.</summary>
        Task EraseAsync(Guid id, Guid performedByEmployeeId, EraseEmployeeRequestDto request);
        Task<IEnumerable<ErasureRecordResponseDto>> GetErasureLogAsync();
        /// <summary>Current employees' id, name, position and department only — for pickers any user may see.</summary>
        Task<IEnumerable<EmployeeDirectoryEntryDto>> GetDirectoryAsync();
    }
}
