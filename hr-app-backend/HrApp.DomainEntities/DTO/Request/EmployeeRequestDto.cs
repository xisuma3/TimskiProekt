using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Request
{
    public class EmployeeRequestDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public DateTime HireDate { get; set; }
        public string Position { get; set; }
        public Guid? DepartmentID { get; set; }
        public Guid? ManagerID { get; set; }
        public Guid? MentorID { get; set; }

        public string ApplicationUserId { get; set; }
    }
}
