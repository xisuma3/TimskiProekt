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
    }
}
