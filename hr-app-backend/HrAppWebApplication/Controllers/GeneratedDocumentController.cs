using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class GeneratedDocumentController : ControllerBase
    {
        private readonly IGeneratedDocumentService _service;

        public GeneratedDocumentController(IGeneratedDocumentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GeneratedDocumentResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetByEmployeeId(Guid employeeId)
        {
            return Ok(await _service.GetByEmployeeIdAsync(employeeId));
        }

        [HttpGet("template/{templateId}")]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetByTemplateId(Guid templateId)
        {
            return Ok(await _service.GetByTemplateIdAsync(templateId));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<string>> GetContent(Guid id)
        {
            var content = await _service.GetDocumentContentAsync(id);
            return content == null ? NotFound() : Ok(content);
        }

        [HttpPost]
        public async Task<ActionResult<GeneratedDocumentResponseDto>> Generate([FromBody] GeneratedDocumentRequestDto dto)
        {
            try
            {
                var created = await _service.GenerateDocumentAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.DocumentID }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
