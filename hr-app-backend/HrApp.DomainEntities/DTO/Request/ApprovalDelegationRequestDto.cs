using System;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    public class ApprovalDelegationRequestDto
    {
        /// <summary>
        /// Whose authority is being handed over. Ignored for non-admins — a manager can only
        /// delegate their own authority, so the server takes it from the token.
        /// </summary>
        public Guid? DelegatorEmployeeID { get; set; }

        [Required(ErrorMessage = "Choose who will approve in your place.")]
        public Guid DelegateEmployeeID { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [StringLength(500)]
        public string? Note { get; set; }
    }
}
