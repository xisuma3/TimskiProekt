using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class GeneratedDocumentService : IGeneratedDocumentService
    {
        private readonly IGeneratedDocumentRepository _documentRepository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly IDocumentTemplateRepository _templateRepository;
        private readonly ITemplateProcessingService _templateProcessingService;

        public GeneratedDocumentService(
            IGeneratedDocumentRepository documentRepository,
            IEmployeeRepository employeeRepository,
            IDocumentTemplateRepository templateRepository,
            ITemplateProcessingService templateProcessingService)
        {
            _documentRepository = documentRepository;
            _employeeRepository = employeeRepository;
            _templateRepository = templateRepository;
            _templateProcessingService = templateProcessingService;
        }

        public async Task<IEnumerable<GeneratedDocumentResponseDto>> GetAllAsync()
        {
            var documents = await _documentRepository.GetAllAsync();
            return documents.Select(MapToDto);
        }

        public async Task<GeneratedDocumentResponseDto> GetByIdAsync(Guid id)
        {
            var document = await _documentRepository.GetByIdAsync(id);
            return document == null ? null : MapToDto(document);
        }

        public async Task<IEnumerable<GeneratedDocumentResponseDto>> GetByEmployeeIdAsync(Guid employeeId)
        {
            var documents = await _documentRepository.GetByEmployeeIdAsync(employeeId);
            return documents.Select(MapToDto);
        }

        public async Task<IEnumerable<GeneratedDocumentResponseDto>> GetByTemplateIdAsync(Guid templateId)
        {
            var documents = await _documentRepository.GetByTemplateIdAsync(templateId);
            return documents.Select(MapToDto);
        }

        public async Task<GeneratedDocumentResponseDto> GenerateDocumentAsync(GeneratedDocumentRequestDto dto)
        {
            // Validate employee exists
            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            // Validate template exists
            var template = await _templateRepository.GetByIdAsync(dto.TemplateID);
            if (template == null)
                throw new ArgumentException("Template not found");

            // Process template to generate content
            var processedContent = await _templateProcessingService.ProcessTemplateAsync(
                dto.TemplateID, 
                dto.EmployeeID, 
                dto.AssetIDs);

            var document = new GeneratedDocument
            {
                EmployeeID = dto.EmployeeID,
                TemplateID = dto.TemplateID,
                Content = processedContent,
                AssetIDs = dto.AssetIDsJson,
                GeneratedDate = DateTime.UtcNow
            };

            var created = await _documentRepository.AddAsync(document);
            return MapToDto(created);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _documentRepository.DeleteAsync(id);
        }

        public async Task<string> GetDocumentContentAsync(Guid id)
        {
            var document = await _documentRepository.GetByIdAsync(id);
            return document?.Content;
        }

        private GeneratedDocumentResponseDto MapToDto(GeneratedDocument document)
        {
            var assetIds = new List<Guid>();
            try
            {
                if (!string.IsNullOrEmpty(document.AssetIDs))
                {
                    assetIds = JsonSerializer.Deserialize<List<Guid>>(document.AssetIDs);
                }
            }
            catch { /* Handle deserialization error if needed */ }

            return new GeneratedDocumentResponseDto
            {
                DocumentID = document.DocumentID,
                EmployeeID = document.EmployeeID,
                EmployeeName = $"{document.Employee?.FirstName} {document.Employee?.LastName}",
                TemplateID = document.TemplateID,
                TemplateName = document.DocumentTemplate?.TemplateName,
                ContentPreview = document.Content.Length > 100
                    ? document.Content.Substring(0, 100) + "..."
                    : document.Content,
                GeneratedDate = document.GeneratedDate,
                //AssetIDs = assetIds,
                DocumentType = document.DocumentTemplate?.TemplateType
            };
        }
    }
}
