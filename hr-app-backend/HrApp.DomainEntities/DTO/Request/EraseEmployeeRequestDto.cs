using System;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    /// <summary>
    /// Why an erasure is happening and on whose request. Both are required: an erasure
    /// nobody can account for is exactly what a regulator would object to.
    /// The performer is not here — it is always the caller, taken from the token.
    /// </summary>
    public class EraseEmployeeRequestDto
    {
        [Required(ErrorMessage = "Say who requested the erasure.")]
        [StringLength(200)]
        public string RequestedBy { get; set; }

        [Required(ErrorMessage = "Give a reason for the erasure.")]
        [StringLength(1000)]
        public string Reason { get; set; }

        /// <summary>When the request was received, if earlier than today.</summary>
        public DateTime? RequestReceivedAt { get; set; }
    }
}
