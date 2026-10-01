using System;

namespace HrApp.DomainEntities.DTO.Response
{
    /// <summary>What carry-over did (or would do, in a preview) for one allowance.</summary>
    public class CarryOverResultDto
    {
        public Guid EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public string LeaveType { get; set; }
        /// <summary>Unused days left at the end of the source year (never negative).</summary>
        public decimal UnusedDays { get; set; }
        /// <summary>Days carried into the next year, after the cap.</summary>
        public decimal CarriedDays { get; set; }
        /// <summary>"Created", "Updated", "Unchanged" or "Skipped".</summary>
        public string Action { get; set; }
        public string? Note { get; set; }
    }
}
