using System;

namespace HrApp.DomainEntities.Models
{
    /// <summary>
    /// A manager handing their leave-approval authority to a colleague for a period —
    /// typically while they are on leave themselves. While active (today within
    /// [StartDate, EndDate] and not revoked) the delegate may decide anything the delegator
    /// could. Decisions record both who acted and on whose behalf.
    ///
    /// Rows are never deleted: revoking sets <see cref="RevokedAt"/>, so the history of who
    /// held authority when stays answerable.
    /// </summary>
    public class ApprovalDelegation
    {
        public Guid DelegationID { get; set; }

        public Guid DelegatorEmployeeID { get; set; }
        public Employee Delegator { get; set; }

        public Guid DelegateEmployeeID { get; set; }
        public Employee Delegate { get; set; }

        /// <summary>First day the delegate may act (calendar date).</summary>
        public DateTime StartDate { get; set; }
        /// <summary>Last day the delegate may act, inclusive (calendar date).</summary>
        public DateTime EndDate { get; set; }

        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; }
        /// <summary>Who set it up — the delegator, or an admin acting for them.</summary>
        public Guid? CreatedByEmployeeID { get; set; }

        public DateTime? RevokedAt { get; set; }

        public bool IsActiveOn(DateTime day) =>
            RevokedAt == null && StartDate.Date <= day.Date && EndDate.Date >= day.Date;
    }
}
