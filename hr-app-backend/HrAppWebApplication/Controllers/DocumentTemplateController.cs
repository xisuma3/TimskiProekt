using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
        [Route("api/[controller]/[action]")]
    public class DocumentTemplateController : ApiControllerBase
    {
        private readonly IDocumentTemplateService _service;
        private readonly ITemplateProcessingService _templateProcessingService;
        private readonly IEmployeeService _employeeService;
        private readonly IAssetService _assetService;

        public DocumentTemplateController(
            IDocumentTemplateService service,
            ITemplateProcessingService templateProcessingService,
            IEmployeeService employeeService,
            IAssetService assetService)
        {
            _service = service;
            _templateProcessingService = templateProcessingService;
            _employeeService = employeeService;
            _assetService = assetService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentTemplateResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DocumentTemplateResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("name/{templateName}")]
        public async Task<ActionResult<DocumentTemplateResponseDto>> GetByName(string templateName)
        {
            var result = await _service.GetByNameAsync(templateName);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("type/{templateType}")]
        public async Task<ActionResult<IEnumerable<DocumentTemplateResponseDto>>> GetByType(string templateType)
        {
            return Ok(await _service.GetByTypeAsync(templateType));
        }

        [HttpGet("{id}/content")]
        public async Task<ActionResult<string>> GetTemplateContent(Guid id)
        {
            var content = await _service.GetTemplateContentAsync(id);
            return content == null ? NotFound() : Ok(content);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DocumentTemplateResponseDto>> Create([FromBody] DocumentTemplateRequestDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.TemplateID }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, [FromBody] DocumentTemplateRequestDto dto)
        {
            try
            {
                await _service.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/preview")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<string>> PreviewTemplate(Guid id, [FromQuery] Guid employeeId, [FromQuery] List<Guid>? assetIds = null)
        {
            try
            {
                var previewContent = await _templateProcessingService.ProcessTemplateAsync(id, employeeId, assetIds ?? new List<Guid>());
                return Ok(previewContent);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<string>> Preview([FromBody] PreviewTemplateRequest request)
        {
            try
            {
                var employeeDto = await _employeeService.GetByIdAsync(request.EmployeeId);
                if (employeeDto == null)
                    return BadRequest(new { message = "Employee not found" });

                var assets = new List<Asset>();
                if (request.AssetIds?.Any() == true)
                {
                    foreach (var assetId in request.AssetIds)
                    {
                        var assetDto = await _assetService.GetByIdAsync(assetId);
                        if (assetDto != null)
                        {
                            // Same ownership rule the real generation path enforces: a
                            // preview must not show one employee holding another's assets.
                            if (assetDto.EmployeeID != request.EmployeeId)
                            {
                                return BadRequest(new
                                {
                                    message = $"Asset '{assetDto.Name}' is not assigned to this employee and cannot be included."
                                });
                            }

                            // Convert DTO to Model (simplified)
                            assets.Add(new Asset 
                            { 
                                AssetID = assetDto.AssetID,
                                Name = assetDto.Name,
                                SerialNumber = assetDto.SerialNumber,
                                Description = assetDto.Description,
                                IsActive = assetDto.IsActive,
                                AssignmentDate = assetDto.AssignmentDate
                            });
                        }
                    }
                }

                // Convert Employee DTO to Model (simplified)
                var employee = new Employee
                {
                    EmployeeID = employeeDto.EmployeeID,
                    FirstName = employeeDto.FirstName,
                    LastName = employeeDto.LastName,
                    Email = employeeDto.Email,
                    Position = employeeDto.Position,
                    HireDate = employeeDto.HireDate,
                    Department = employeeDto.DepartmentName != null ? new Department { Name = employeeDto.DepartmentName } : null
                };

                var previewContent = await _templateProcessingService.ProcessTemplateContentAsync(request.TemplateContent, employee, assets);
                return Ok(previewContent);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
