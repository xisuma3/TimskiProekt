using System;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    public class LeaveEntitlementRequestDto
    {
        [Required]
        public Guid EmployeeID { get; set; }

        [Range(2000, 2100)]
        public int Year { get; set; }

        [Required]
        [RegularExpression("Vacation|Sick|Parental|Unpaid", ErrorMessage = "Invalid leave type")]
        public string LeaveType { get; set; }

        [Range(0, 366)]
        public decimal DaysAllocated { get; set; }

        [Range(0, 366)]
        public decimal DaysCarriedOver { get; set; }
    }
}
