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

        /// <summary>"Upfront" (all on 1 January, the default) or "Monthly" (1/12 at the start of each month).</summary>
        [RegularExpression("Upfront|Monthly", ErrorMessage = "Accrual must be Upfront or Monthly")]
        public string? AccrualMethod { get; set; }
    }
}
