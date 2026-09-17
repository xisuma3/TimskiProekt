using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class LeaveEntitlementController : ApiControllerBase
    {
        private readonly ILeaveEntitlementService _service;
        private readonly IEmployeeService _employeeService;

        public LeaveEntitlementController(ILeaveEntitlementService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveEntitlementResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<LeaveEntitlementResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveEntitlementResponseDto>>> GetByEmployeeId(
            Guid employeeId, [FromQuery] int? year = null)
        {
            return Ok(await _service.GetByEmployeeIdAsync(employeeId, year));
        }

        /// <summary>The caller's own leave balances for a year, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LeaveBalanceResponseDto>>> GetMyBalance([FromQuery] int? year = null)
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<LeaveBalanceResponseDto>());

            return Ok(await _service.GetBalancesAsync(me.EmployeeID, year ?? DateTime.UtcNow.Year));
        }

        [HttpGet("{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveBalanceResponseDto>>> GetBalance(
            Guid employeeId, [FromQuery] int? year = null)
        {
            return Ok(await _service.GetBalancesAsync(employeeId, year ?? DateTime.UtcNow.Year));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<LeaveEntitlementResponseDto>> Create([FromBody] LeaveEntitlementRequestDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.EntitlementID }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, [FromBody] LeaveEntitlementRequestDto dto)
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
            catch (InvalidOperationException ex)
            {
                // Would drop the allowance below what is already committed.
                return Conflict(new { message = ex.Message });
            }
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
