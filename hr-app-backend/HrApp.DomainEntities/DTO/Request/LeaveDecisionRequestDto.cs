using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    /// <summary>
    /// Optional body for approving or rejecting a leave request. The approver's identity
    /// is taken from the caller's token, never from this payload.
    /// </summary>
    public class LeaveDecisionRequestDto
    {
        [StringLength(500)]
        public string? Reason { get; set; }
    }
}
