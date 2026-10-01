using System;

namespace HrApp.DomainEntities.DTO.Response
{
    public class ErasureRecordResponseDto
    {
        public Guid ErasureRecordID { get; set; }
        /// <summary>The erased employee's id — their name no longer exists to show.</summary>
        public Guid EmployeeID { get; set; }
        public Guid PerformedByEmployeeID { get; set; }
        public string PerformedByName { get; set; }
        public DateTime PerformedAt { get; set; }
        public string RequestedBy { get; set; }
        public DateTime? RequestReceivedAt { get; set; }
        public string Reason { get; set; }
    }
}
