using System;

namespace HrApp.DomainEntities.DTO.Response
{
    public class LeaveEntitlementResponseDto
    {
        public Guid EntitlementID { get; set; }
        public Guid EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public int Year { get; set; }
        public string LeaveType { get; set; }
        public decimal DaysAllocated { get; set; }
        public decimal DaysCarriedOver { get; set; }
        public decimal TotalAvailable => DaysAllocated + DaysCarriedOver;
    }
}
