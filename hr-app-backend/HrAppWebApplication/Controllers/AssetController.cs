using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.Service.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]/[action]")]
    public class AssetController : ApiControllerBase
    {
        private readonly IAssetService _service;
        private readonly IEmployeeService _employeeService;

        public AssetController(IAssetService service, IEmployeeService employeeService)
        {
            _service = service;
            _employeeService = employeeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        /// <summary>Assets assigned to the caller, resolved from the token.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetMyAssets()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<AssetResponseDto>());

            return Ok(await _service.GetByEmployeeIdAsync(me.EmployeeID));
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AssetResponseDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("serial/{serialNumber}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AssetResponseDto>> GetBySerialNumber(string serialNumber)
        {
            var result = await _service.GetBySerialNumberAsync(serialNumber);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetByEmployeeId(Guid employeeId)
        {
            return Ok(await _service.GetByEmployeeIdAsync(employeeId));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AssetResponseDto>> Create([FromBody] AssetRequestDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.AssetID }, created);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(Guid id, [FromBody] AssetRequestDto dto)
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

        // --- Custody ---

        /// <summary>Hands the asset to an employee, closing any open assignment first.</summary>
        [HttpPost("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AssetAssignmentResponseDto>> Assign(Guid id, [FromBody] AssignAssetRequestDto dto)
        {
            try
            {
                return Ok(await _service.AssignAsync(id, dto));
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

        /// <summary>Takes the asset back into stock.</summary>
        [HttpPost("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AssetAssignmentResponseDto>> Return(Guid id, [FromBody] ReturnAssetRequestDto? dto = null)
        {
            try
            {
                return Ok(await _service.ReturnAsync(id, dto ?? new ReturnAssetRequestDto()));
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

        /// <summary>Who has held this asset, newest first.</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AssetAssignmentResponseDto>>> GetHistory(Guid id)
        {
            return Ok(await _service.GetHistoryAsync(id));
        }

        /// <summary>Everything the caller has ever held, including returned items.</summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AssetAssignmentResponseDto>>> GetMyAssetHistory()
        {
            var me = await _employeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId);
            if (me == null) return Ok(Array.Empty<AssetAssignmentResponseDto>());

            return Ok(await _service.GetEmployeeHistoryAsync(me.EmployeeID));
        }
    }
}
