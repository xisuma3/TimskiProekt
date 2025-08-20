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
    public class DocumentTemplateService : IDocumentTemplateService
    {
        private readonly IDocumentTemplateRepository _repository;

        public DocumentTemplateService(IDocumentTemplateRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<DocumentTemplateResponseDto>> GetAllAsync()
        {
            var templates = await _repository.GetAllAsync();
            return templates.Select(MapToDto);
        }

        public async Task<DocumentTemplateResponseDto> GetByIdAsync(Guid id)
        {
            var template = await _repository.GetByIdAsync(id);
            return template == null ? null : MapToDto(template);
        }

        public async Task<DocumentTemplateResponseDto> GetByNameAsync(string templateName)
        {
            var template = await _repository.GetByNameAsync(templateName);
            return template == null ? null : MapToDto(template);
        }

        public async Task<IEnumerable<DocumentTemplateResponseDto>> GetByTypeAsync(string templateType)
        {
            var templates = await _repository.GetByTypeAsync(templateType);
            return templates.Select(MapToDto);
        }

        public async Task<DocumentTemplateResponseDto> CreateAsync(DocumentTemplateRequestDto dto)
        {
            // Check for duplicate template names
            var existingTemplate = await _repository.GetByNameAsync(dto.TemplateName);
            if (existingTemplate != null)
            {
                throw new ArgumentException("A template with this name already exists");
            }

            var template = new DocumentTemplate
            {
                TemplateName = dto.TemplateName,
                Description = dto.Description,
                TemplateContent = dto.TemplateContent,
                TemplateType = dto.TemplateType
            };

            var created = await _repository.AddAsync(template);
            return MapToDto(created);
        }

        public async Task UpdateAsync(Guid id, DocumentTemplateRequestDto dto)
        {
            var existingTemplate = await _repository.GetByIdAsync(id);
            if (existingTemplate == null)
            {
                throw new ArgumentException("Template not found");
            }

            // Check for name conflict with other templates
            var duplicateNameTemplate = await _repository.GetByNameAsync(dto.TemplateName);
            if (duplicateNameTemplate != null && duplicateNameTemplate.TemplateID != id)
            {
                throw new ArgumentException("Another template already uses this name");
            }

            existingTemplate.TemplateName = dto.TemplateName;
            existingTemplate.Description = dto.Description;
            existingTemplate.TemplateContent = dto.TemplateContent;
            existingTemplate.TemplateType = dto.TemplateType;

            await _repository.UpdateAsync(existingTemplate);
        }

        public async Task DeleteAsync(Guid id)
        {
            var template = await _repository.GetByIdAsync(id);
            if (template?.GeneratedDocuments?.Any() == true)
            {
                throw new InvalidOperationException("Cannot delete template with generated documents");
            }

            await _repository.DeleteAsync(id);
        }

        public async Task<string> GetTemplateContentAsync(Guid id)
        {
            var template = await _repository.GetByIdAsync(id);
            return template?.TemplateContent;
        }

        private DocumentTemplateResponseDto MapToDto(DocumentTemplate template)
        {
            return new DocumentTemplateResponseDto
            {
                TemplateID = template.TemplateID,
                TemplateName = template.TemplateName,
                Description = template.Description,
                TemplateContent = template.TemplateContent,
                TemplateType = template.TemplateType,
                LastModifiedDate = GetLastModifiedDate(template),
                GeneratedDocumentsCount = template.GeneratedDocuments?.Count ?? 0
            };
        }

        private DateTime? GetLastModifiedDate(DocumentTemplate template)
        {
            // Implement logic to get last modified date if available
            // This could come from your database audit fields
            return null; // Placeholder
        }
    }
}
