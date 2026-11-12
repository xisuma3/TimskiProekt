using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface IDocumentTemplateService
    {
        Task<IEnumerable<DocumentTemplateResponseDto>> GetAllAsync();
        /// <summary>Only templates HR opted in to self-service, without their content.</summary>
        Task<IEnumerable<SelfServiceTemplateResponseDto>> GetSelfServiceAsync();
        Task<DocumentTemplateResponseDto> GetByIdAsync(Guid id);
        Task<DocumentTemplateResponseDto> GetByNameAsync(string templateName);
        Task<IEnumerable<DocumentTemplateResponseDto>> GetByTypeAsync(string templateType);
        Task<DocumentTemplateResponseDto> CreateAsync(DocumentTemplateRequestDto dto);
        Task UpdateAsync(Guid id, DocumentTemplateRequestDto dto);
        Task DeleteAsync(Guid id);
        Task<string> GetTemplateContentAsync(Guid id);
    }

}
