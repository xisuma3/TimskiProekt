using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.Models
{
    public class DocumentTemplate
    {
        public Guid TemplateID { get; set; }
        public string TemplateName { get; set; }
        public string? Description { get; set; }
        public string TemplateContent { get; set; }
        public string TemplateType { get; set; } // 'Asset', 'Employment', 'Salary'

        public ICollection<GeneratedDocument> GeneratedDocuments { get; set; }
    }
}
