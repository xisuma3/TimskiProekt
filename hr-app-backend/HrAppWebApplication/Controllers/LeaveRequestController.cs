using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class LeaveRequestController : ApiControllerBase
    {
        private readonly ILeaveRequestService _service;
        private readonly IEmployeeService _employeeService;

        public LeaveRequestController(ILeaveRequestService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveRequestResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        /// <summary>Leave requests filed by the caller, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LeaveRequestResponseDto>>> GetMyLeaveRequests()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<LeaveRequestResponseDto>());

            return Ok(await _service.GetByEmployeeIdAsync(me.EmployeeID));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<LeaveRequestResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();

            if (!IsAdmin)
            {
                var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
                if (me == null || me.EmployeeID != result.EmployeeID) return Forbid();
            }

            return Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveRequestResponseDto>>> GetByEmployeeId(Guid employeeId)
        {
            return Ok(await _service.GetByEmployeeIdAsync(employeeId));
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<LeaveRequestResponseDto>>> GetPendingRequests()
        {
            return Ok(await _service.GetPendingRequestsAsync());
        }

        /// <summary>
        /// Files a leave request. A non-admin always files for themselves — the EmployeeID
        /// in the payload is ignored, because the caller controls it.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<LeaveRequestResponseDto>> Create([FromBody] LeaveRequestRequestDto dto)
        {
            if (!IsAdmin)
            {
                var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
                if (me == null)
                {
                    return BadRequest(new { message = "No employee record is linked to this account." });
                }
                dto.EmployeeID = me.EmployeeID;
            }

            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.RequestID }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message,
                    errorType = "ValidationError"
                });
            }
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(Guid id, [FromBody] LeaveDecisionRequestDto? decision = null)
        {
            return await Decide(id, decision, approve: true);
        }

        [HttpPut("{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] LeaveDecisionRequestDto? decision = null)
        {
            return await Decide(id, decision, approve: false);
        }

        private async Task<IActionResult> Decide(Guid id, LeaveDecisionRequestDto? decision, bool approve)
        {
            // The approver is whoever holds the token, never a value from the payload.
            var approver = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (approver == null)
            {
                // An approval nobody can be held to is not an approval. Refuse rather than
                // silently writing a decision with no approver.
                return BadRequest(new
                {
                    message = "Your account has no linked employee record, so a decision cannot be attributed to you."
                });
            }

            try
            {
                if (approve)
                    await _service.ApproveRequestAsync(id, approver?.EmployeeID, decision?.Reason);
                else
                    await _service.RejectRequestAsync(id, approver?.EmployeeID, decision?.Reason);

                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // Already decided, or deciding your own request.
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
