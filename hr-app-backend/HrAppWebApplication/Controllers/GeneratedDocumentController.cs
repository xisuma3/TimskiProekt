using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class GeneratedDocumentController : ApiControllerBase
    {
        private readonly IGeneratedDocumentService _service;
        private readonly IEmployeeService _employeeService;

        public GeneratedDocumentController(IGeneratedDocumentService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        /// <summary>Documents generated for the caller, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetMyDocuments()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<GeneratedDocumentResponseDto>());

            return Ok(await _service.GetByEmployeeIdAsync(me.EmployeeID));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GeneratedDocumentResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            if (!await CallerMayRead(result.EmployeeID)) return Forbid();

            return Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetByEmployeeId(Guid employeeId)
        {
            return Ok(await _service.GetByEmployeeIdAsync(employeeId));
        }

        [HttpGet("template/{templateId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<GeneratedDocumentResponseDto>>> GetByTemplateId(Guid templateId)
        {
            return Ok(await _service.GetByTemplateIdAsync(templateId));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<string>> GetContent(Guid id)
        {
            var document = await _service.GetByIdAsync(id);
            if (document == null) return NotFound();
            if (!await CallerMayRead(document.EmployeeID)) return Forbid();

            var content = await _service.GetDocumentContentAsync(id);
            return content == null ? NotFound() : Ok(content);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
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
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }

        /// <summary>Admins read anything; everyone else only their own documents.</summary>
        private async Task<bool> CallerMayRead(Guid documentOwnerId)
        {
            if (IsAdmin) return true;

            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            return me != null && me.EmployeeID == documentOwnerId;
        }
    }
}
