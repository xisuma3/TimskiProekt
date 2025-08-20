using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using static HrApp.DomainEntities.DTO.Request.LoginRequestDto;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HrApp.DomainEntities.DTO.Request;
using HrApp.Service.Interface;

namespace HrAppWebApplication.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly IEmployeeService _employeeService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            IEmployeeService employeeService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _employeeService = employeeService;
        }

        // --- User Registration Endpoint ---
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                EmailConfirmed = true
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, "Employee");

                // Create the Employee record linked to this ApplicationUser
                var employeeDto = new EmployeeRequestDto
                {
                    ApplicationUserId = user.Id,
                    Email = user.Email,
                    // Use provided employee details or defaults
                    FirstName = !string.IsNullOrEmpty(model.FirstName) ? model.FirstName : user.UserName,
                    LastName = model.LastName ?? "",
                    Position = model.Position ?? "",
                    DepartmentID = model.DepartmentID,
                    HireDate = model.HireDate ?? DateTime.Now,
                    ManagerID = null,
                    MentorID = null
                };

                var createdEmployee = await _employeeService.AddAsync(employeeDto);

                return Ok(new
                {
                    Message = "User and employee created successfully!",
                    UserId = user.Id,
                    EmployeeId = createdEmployee.EmployeeID
                });
            }
            
            return BadRequest(result.Errors);
            /*return Ok(new
            {
                Message = "User created successfully!",
                UserId = user.Id
            });*/
        }

        // --- User Login Endpoint ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return Unauthorized(new { Message = "Invalid credentials." });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                // Generate JWT token
                var token = await GenerateJwtToken(user);
                var roles = await _userManager.GetRolesAsync(user);

                return Ok(new AuthResponseDto
                {
                    Token = token,
                    UserId = user.Id,
                    Email = user.Email,
                    Roles = roles
                });
            }
            else if (result.IsLockedOut)
            {
                return Unauthorized(new { Message = "Account locked out." });
            }
            else if (result.IsNotAllowed)
            {
                return Unauthorized(new { Message = "Login not allowed (e.g., email not confirmed)." });
            }
            else
            {
                return Unauthorized(new { Message = "Invalid credentials." });
            }
        }

        // --- Helper method to generate JWT Token ---
        private async Task<string> GenerateJwtToken(ApplicationUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Subject (user ID)
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // JWT ID
                new Claim(JwtRegisteredClaimNames.Email, user.Email), // Email
                new Claim(ClaimTypes.NameIdentifier, user.Id), // Standard claim for user ID
                new Claim(ClaimTypes.Name, user.UserName) // Standard claim for user name
            };

            // Add roles as claims
            var userRoles = await _userManager.GetRolesAsync(user);
            foreach (var role in userRoles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.Now.AddMinutes(Convert.ToDouble(_configuration["Jwt:DurationInMinutes"]));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // --- Basic Logout (API-style) ---
        // For JWTs, logout is primarily a client-side operation (deleting the token).
        // This endpoint can be used to invalidate server-side session cookies (if any are used)
        // or perform other server-side cleanup. For pure JWT, it's often optional.
        [HttpPost("logout")]
        // [Authorize] // Optional: require user to be authenticated to logout (if doing server-side cleanup)
        public async Task<IActionResult> Logout()
        {
            // If using cookies, you might sign out here:
            // await _signInManager.SignOutAsync();

            // For pure JWT, the client simply discards the token.
            // You might implement token blacklisting here if you need immediate invalidation,
            // but that adds complexity (requires a distributed cache/database for blacklisted tokens).
            return Ok(new { Message = "Logged out successfully (client-side token removal expected)." });
        }
    }
}
