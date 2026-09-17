using System;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    /// <summary>Hand an asset to an employee. Any open assignment is closed first.</summary>
    public class AssignAssetRequestDto
    {
        [Required]
        public Guid EmployeeID { get; set; }

        /// <summary>Defaults to now when omitted.</summary>
        public DateTime? AssignedDate { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }

    /// <summary>Take an asset back into stock.</summary>
    public class ReturnAssetRequestDto
    {
        /// <summary>Defaults to now when omitted.</summary>
        public DateTime? ReturnedDate { get; set; }

        [StringLength(200)]
        public string? ReturnCondition { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }
}
