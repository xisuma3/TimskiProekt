using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Response
{
    public class LeaveRequestResponseDto
    {
        public Guid RequestID { get; set; }
        public Guid EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TotalDays => (EndDate - StartDate).Days + 1;

        public Guid? ApprovedByEmployeeID { get; set; }
        public string ApprovedByName { get; set; }
        public DateTime? DecisionAt { get; set; }
        public string DecisionReason { get; set; }

        /// <summary>Set when the approver acted under a delegation: whose authority they used.</summary>
        public Guid? DecidedOnBehalfOfEmployeeID { get; set; }
        public string DecidedOnBehalfOfName { get; set; }

        /// <summary>
        /// Only on the "requests I can decide" view: why the caller may decide this one —
        /// "Direct report", "Indirect report", or "Delegated by &lt;name&gt;".
        /// </summary>
        public string ApprovalRoute { get; set; }
    }
}
