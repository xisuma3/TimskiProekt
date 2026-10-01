using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface IGeneratedDocumentService
    {
        Task<IEnumerable<GeneratedDocumentResponseDto>> GetAllAsync();
        Task<GeneratedDocumentResponseDto> GetByIdAsync(Guid id);
        Task<IEnumerable<GeneratedDocumentResponseDto>> GetByEmployeeIdAsync(Guid employeeId);
        Task<IEnumerable<GeneratedDocumentResponseDto>> GetByTemplateIdAsync(Guid templateId);
        Task<GeneratedDocumentResponseDto> GenerateDocumentAsync(GeneratedDocumentRequestDto dto);
        /// <summary>Caller generates for themselves; only self-service templates. Throws
        /// UnauthorizedAccessException for an HR-only template.</summary>
        Task<GeneratedDocumentResponseDto> GenerateSelfServiceAsync(Guid employeeId, Guid templateId, List<Guid> assetIds);
        Task DeleteAsync(Guid id);
        Task<string> GetDocumentContentAsync(Guid id);
    }
}
