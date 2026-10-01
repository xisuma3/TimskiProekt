using System;

namespace HrApp.DomainEntities.DTO.Response
{
    public class ApprovalDelegationResponseDto
    {
        public Guid DelegationID { get; set; }
        public Guid DelegatorEmployeeID { get; set; }
        public string DelegatorName { get; set; }
        public Guid DelegateEmployeeID { get; set; }
        public string DelegateName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        /// <summary>"Scheduled", "Active", "Ended" or "Revoked", as of today.</summary>
        public string Status { get; set; }
    }
}
