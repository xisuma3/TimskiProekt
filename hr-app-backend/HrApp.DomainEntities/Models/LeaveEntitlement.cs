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
    /// Types with no entitlement row are unlimited — sick leave is usually governed by
    /// policy and certificates rather than a day count, so an absent row means
    /// "not capped here" rather than "zero days".
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
    }
}
