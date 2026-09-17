using System;

namespace HrApp.DomainEntities.DTO.Response
{
    /// <summary>
    /// One employee's standing for one leave type in one year.
    ///
    /// Pending days are held against the balance as well as approved ones — an employee
    /// with 2 days left should not be able to file three more requests and have them all
    /// approvable.
    /// </summary>
    public class LeaveBalanceResponseDto
    {
        public Guid EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public int Year { get; set; }
        public string LeaveType { get; set; }

        /// <summary>False when no entitlement row exists; this type is then uncapped.</summary>
        public bool IsTracked { get; set; }

        public decimal DaysAllocated { get; set; }
        public decimal DaysCarriedOver { get; set; }
        public decimal TotalAvailable => DaysAllocated + DaysCarriedOver;

        public decimal DaysApproved { get; set; }
        public decimal DaysPending { get; set; }
        public decimal DaysCommitted => DaysApproved + DaysPending;

        public decimal DaysRemaining => TotalAvailable - DaysCommitted;
    }
}
