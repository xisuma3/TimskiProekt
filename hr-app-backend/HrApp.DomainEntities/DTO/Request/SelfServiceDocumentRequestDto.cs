using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    /// <summary>
    /// An employee asking for a document about themselves. Deliberately has no EmployeeID:
    /// the subject is always the caller, resolved from the token.
    /// </summary>
    public class SelfServiceDocumentRequestDto
    {
        [Required]
        public Guid TemplateID { get; set; }

        /// <summary>Assets to list on the document; each must be held by the caller.</summary>
        public List<Guid> AssetIDs { get; set; } = new List<Guid>();
    }
}
