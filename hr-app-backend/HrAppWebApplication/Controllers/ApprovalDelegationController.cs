using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    /// <summary>
    /// Approval delegation: a manager hands their leave-approval authority to a colleague
    /// for a date range (e.g. while on leave). Non-admins can only delegate their own
    /// authority — the delegator is always taken from the token for them.
    /// </summary>
    [Route("api/[controller]/[action]")]
    public class ApprovalDelegationController : ApiControllerBase
    {
        private readonly IApprovalDelegationService _service;
        private readonly IEmployeeService _employeeService;

        public ApprovalDelegationController(IApprovalDelegationService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        /// <summary>Delegations I gave or received.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ApprovalDelegationResponseDto>>> GetMine()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<ApprovalDelegationResponseDto>());
            return Ok(await _service.GetInvolvingAsync(me.EmployeeID));
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ApprovalDelegationResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpPost]
        public async Task<ActionResult<ApprovalDelegationResponseDto>> Create([FromBody] ApprovalDelegationRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return BadRequest(new { message = "No employee record is linked to this account." });

            // Identity from the token, never the body: a manager delegates only their own authority.
            var delegatorId = IsAdmin && dto.DelegatorEmployeeID.HasValue ? dto.DelegatorEmployeeID.Value : me.EmployeeID;

            try
            {
                var created = await _service.CreateAsync(delegatorId, me.EmployeeID, dto);
                return Ok(created);
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

        [HttpPost("{id}")]
        public async Task<IActionResult> Revoke(Guid id)
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null && !IsAdmin) return BadRequest(new { message = "No employee record is linked to this account." });

            try
            {
                await _service.RevokeAsync(id, me?.EmployeeID ?? Guid.Empty, IsAdmin);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
