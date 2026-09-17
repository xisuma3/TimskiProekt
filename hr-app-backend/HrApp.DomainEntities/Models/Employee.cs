using HrApp.DomainEntities.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.Models
{
    public class Employee
    {
        public Guid EmployeeID { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; } 

        //public string PasswordHash { get; set; } // brisi
        public DateTime HireDate { get; set; }
        public string? Position { get; set; }

        public Guid? DepartmentID { get; set; }
        public Department? Department { get; set; }

        public Guid? ManagerID { get; set; }
        public Employee? Manager { get; set; }
        public ICollection<Employee> Subordinates { get; set; }

        public Guid? MentorID { get; set; }
        public Employee? Mentor { get; set; }
        public ICollection<Employee> Mentees { get; set; }

        public EmployeeDossier? EmployeeDossier { get; set; }
        public ICollection<LeaveRequest> LeaveRequests { get; set; }
        public ICollection<Asset> Assets { get; set; }
        public ICollection<GeneratedDocument> GeneratedDocuments { get; set; }


        public string? ApplicationUserId { get; set; }
        public virtual ApplicationUser? ApplicationUser { get; set; }

        // --- Soft delete ---
        // Employees are retired, not erased. Their leave decisions, asset custody and
        // signed documents are records of fact that must outlive the employment, so
        // EmployeeRepository filters these out of normal reads instead of deleting rows.
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

    }
}
