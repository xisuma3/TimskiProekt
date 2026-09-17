using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrAppWebApplication.Controllers
{
    /// <summary>
    /// Base for every API controller in this app.
    ///
    /// Carries <c>[Authorize]</c> so an action is authenticated unless it opts out with
    /// <c>[AllowAnonymous]</c>, and exposes the caller's identity from the JWT rather than
    /// from the request body. Never trust an EmployeeID that arrived in a payload to
    /// identify the caller — use <see cref="CurrentApplicationUserId"/>.
    /// </summary>
    [ApiController]
    [Authorize]
    public abstract class ApiControllerBase : ControllerBase
    {
        /// <summary>
        /// The ApplicationUser id of the caller, taken from the token's NameIdentifier claim.
        /// Null only if the action is anonymous.
        /// </summary>
        protected string? CurrentApplicationUserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        protected bool IsAdmin => User.IsInRole("Admin");
    }
}
