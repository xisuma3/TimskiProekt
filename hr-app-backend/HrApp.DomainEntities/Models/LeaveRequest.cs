using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.Models
{
    public class LeaveRequest
    {
        public Guid RequestID { get; set; }

        public Guid EmployeeID { get; set; }
        public Employee Employee { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; } // 'Vacation', 'Sick', 'Parental', 'Unpaid'
        public string Status { get; set; } // 'Pending', 'Approved', 'Rejected'
        public DateTime CreatedAt { get; set; }

        // --- Decision audit trail ---
        // Who decided, when, and why. Without these an approval is an unattributable
        // string change and the leave process cannot be audited.
        public Guid? ApprovedByEmployeeID { get; set; }
        public Employee? ApprovedBy { get; set; }
        public DateTime? DecisionAt { get; set; }
        public string? DecisionReason { get; set; }

        /// <summary>
        /// Set when the decision was made under a delegation: the manager whose authority the
        /// approver was exercising. Null when the approver acted on their own authority.
        /// </summary>
        public Guid? DecidedOnBehalfOfEmployeeID { get; set; }
        public Employee? DecidedOnBehalfOf { get; set; }
    }
}
