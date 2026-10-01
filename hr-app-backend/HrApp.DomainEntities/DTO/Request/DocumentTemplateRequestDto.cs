using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Request
{
    public class DocumentTemplateRequestDto
    {
        [Required]
        [StringLength(100, ErrorMessage = "Template name cannot exceed 100 characters")]
        public string TemplateName { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string Description { get; set; }

        [Required(ErrorMessage = "Template content is required")]
        public string TemplateContent { get; set; }

        [Required]
        [RegularExpression("Asset|Employment|Salary", ErrorMessage = "Invalid template type")]
        public string TemplateType { get; set; }

        /// <summary>Lets employees generate this document for themselves. Defaults to off.</summary>
        public bool AllowSelfService { get; set; }
    }
}
