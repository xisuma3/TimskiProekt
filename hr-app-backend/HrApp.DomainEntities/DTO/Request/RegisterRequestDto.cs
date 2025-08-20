using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Request
{
    public class RegisterRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }

        // Additional employee fields - optional for backward compatibility
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Position { get; set; }
        public Guid? DepartmentID { get; set; }
        public DateTime? HireDate { get; set; }
    }
}
