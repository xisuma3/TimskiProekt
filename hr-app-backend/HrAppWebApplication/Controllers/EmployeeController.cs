using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class EmployeeController : ApiControllerBase
    {
        private readonly IEmployeeService _service;

        public EmployeeController(IEmployeeService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        /// <summary>The caller's own employee record, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<EmployeeResponseDto>> GetMyProfile()
        {
            var result = await _service.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (result == null) return NotFound(new { message = "No employee record is linked to this account." });
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EmployeeResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();

            // A non-admin may only read their own record.
            if (!IsAdmin)
            {
                var me = await _service.GetByApplicationUserIdAsync(CurrentApplicationUserId);
                if (me == null || me.EmployeeID != id) return Forbid();
            }

            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<EmployeeResponseDto>> Create([FromBody] EmployeeRequestDto dto)
        {
            var created = await _service.AddAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.EmployeeID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(Guid id, [FromBody] UpdateEmployeeRequestDto dto)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await _service.UpdateAsync(id, dto);
            return NoContent();
        }

        /// <summary>
        /// Retires an employee. This is a soft delete: their leave decisions, asset custody
        /// and generated documents are preserved and stay queryable.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await _service.DeleteAsync(id);
            return NoContent();
        }

        /// <summary>Brings a retired employee back.</summary>
        [HttpPost("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Restore(Guid id)
        {
            try
            {
                await _service.RestoreAsync(id);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
