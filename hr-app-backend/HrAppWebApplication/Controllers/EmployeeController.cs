using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [ApiController]
    [Route("api/[controller]/[action]")]
    public class EmployeeController : ControllerBase
    {
        private readonly IEmployeeService _service;

        public EmployeeController(IEmployeeService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EmployeeResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<EmployeeResponseDto>> Create([FromBody] EmployeeRequestDto dto)
        {   
            var created = await _service.AddAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.EmployeeID }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Edit(Guid id, [FromBody] UpdateEmployeeRequestDto dto)
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
