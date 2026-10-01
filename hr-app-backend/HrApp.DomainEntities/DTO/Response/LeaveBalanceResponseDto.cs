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

        /// <summary>False when no entitlement row exists; requests of this type are then refused.</summary>
        public bool IsTracked { get; set; }

        public decimal DaysAllocated { get; set; }
        public decimal DaysCarriedOver { get; set; }
        /// <summary>The full year's entitlement: allocation plus carry-over.</summary>
        public decimal TotalAvailable => DaysAllocated + DaysCarriedOver;

        /// <summary>"Upfront" or "Monthly".</summary>
        public string AccrualMethod { get; set; }
        /// <summary>The date the accrual was worked out for.</summary>
        public DateTime AsOf { get; set; }
        /// <summary>How much of the allocation has accrued by <see cref="AsOf"/> (all of it when Upfront).</summary>
        public decimal DaysAccrued { get; set; }
        /// <summary>Usable by <see cref="AsOf"/>: accrued allocation plus carry-over (always in full).</summary>
        public decimal DaysAvailable => DaysAccrued + DaysCarriedOver;

        public decimal DaysApproved { get; set; }
        public decimal DaysPending { get; set; }
        public decimal DaysCommitted => DaysApproved + DaysPending;

        public decimal DaysRemaining => DaysAvailable - DaysCommitted;
    }
}
