using System;

namespace HrApp.DomainEntities.Models
{
    /// <summary>
    /// How many days of one leave type an employee is allowed in one calendar year.
    ///
    /// Balance is deliberately *derived* rather than stored as a running total: a stored
    /// counter drifts the moment a request is edited, deleted or back-dated, and there is
    /// no way to tell which number is right. Remaining days are always
    /// <see cref="DaysAllocated"/> minus the days committed by Pending and Approved
    /// requests in the same year and type.
    ///
    /// A type with no entitlement row has no allowance: requests of that type are refused
    /// until HR sets one up.
    ///
    /// <see cref="AccrualMethod"/> decides how the allocation becomes available:
    /// "Upfront" grants it all on 1 January; "Monthly" grants 1/12 at the start of each
    /// month. Carried-over days are always available in full.
    /// </summary>
    public class LeaveEntitlement
    {
        public Guid EntitlementID { get; set; }

        public Guid EmployeeID { get; set; }
        public Employee Employee { get; set; }

        /// <summary>Calendar year the allowance applies to.</summary>
        public int Year { get; set; }

        /// <summary>'Vacation', 'Sick', 'Parental', 'Unpaid'.</summary>
        public string LeaveType { get; set; }

        public decimal DaysAllocated { get; set; }

        /// <summary>Days carried over from the previous year, if the policy allows it.</summary>
        public decimal DaysCarriedOver { get; set; }

        public decimal TotalAvailable => DaysAllocated + DaysCarriedOver;

        public const string AccrualUpfront = "Upfront";
        public const string AccrualMonthly = "Monthly";

        /// <summary>"Upfront" (default) or "Monthly".</summary>
        public string AccrualMethod { get; set; } = AccrualUpfront;
    }
}
