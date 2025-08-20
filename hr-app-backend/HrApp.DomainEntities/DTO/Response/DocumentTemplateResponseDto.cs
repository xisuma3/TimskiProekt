using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Response
{
    public class DocumentTemplateResponseDto
    {
        public Guid TemplateID { get; set; }
        public string TemplateName { get; set; }
        public string Description { get; set; }
        public string TemplateContent { get; set; }
        public string TemplateType { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public int GeneratedDocumentsCount { get; set; }
    }
}
