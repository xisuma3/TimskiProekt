using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class EmployeeDossierController : ApiControllerBase
    {
        private readonly IEmployeeDossierService _service;
        private readonly IEmployeeService _employeeService;

        public EmployeeDossierController(IEmployeeDossierService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<EmployeeDossierResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        /// <summary>The caller's own dossier, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeDossierResponseDto>>> GetMyDossier()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<EmployeeDossierResponseDto>());

            var dossier = await _service.GetByEmployeeIdAsync(me.EmployeeID);

            // DataPage on the frontend renders a list, so return 0-or-1 items rather than
            // a bare object or a 404.
            return Ok(dossier == null
                ? Array.Empty<EmployeeDossierResponseDto>()
                : new[] { dossier });
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<EmployeeDossierResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<EmployeeDossierResponseDto>> GetByEmployeeId(Guid employeeId)
        {
            var result = await _service.GetByEmployeeIdAsync(employeeId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<EmployeeDossierResponseDto>> Create([FromBody] EmployeeDossierRequestDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.DossierID }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, [FromBody] EmployeeDossierRequestDto dto)
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
