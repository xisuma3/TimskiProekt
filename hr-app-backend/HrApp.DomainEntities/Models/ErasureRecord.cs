using System;

namespace HrApp.DomainEntities.Models
{
    /// <summary>
    /// The audit record of one GDPR erasure: who performed it, who asked for it, why, and
    /// when. Written in the same transaction as the erasure itself and never updated or
    /// deleted — a regulator asking "who erased this person and on whose request?" must
    /// always get an answer, even though the person's own data is gone.
    ///
    /// It deliberately holds no personal data about the erased employee beyond the id the
    /// retained records already point at.
    /// </summary>
    public class ErasureRecord
    {
        public Guid ErasureRecordID { get; set; }

        public Guid EmployeeID { get; set; }
        public Employee Employee { get; set; }

        /// <summary>The admin who performed the erasure, from their token.</summary>
        public Guid PerformedByEmployeeID { get; set; }
        public Employee PerformedBy { get; set; }

        public DateTime PerformedAt { get; set; }

        /// <summary>Who made the request — e.g. "The employee, by email", "Their solicitor".</summary>
        public string RequestedBy { get; set; }

        /// <summary>When the request was received, if it predates the erasure.</summary>
        public DateTime? RequestReceivedAt { get; set; }

        public string Reason { get; set; }
    }
}
