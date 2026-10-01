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

        /// <summary>
        /// When true, an employee may generate this document for themselves (e.g. an
        /// employment confirmation letter). Off by default: templates are HR-only unless
        /// an admin opts one in.
        /// </summary>
        public bool AllowSelfService { get; set; }

        public ICollection<GeneratedDocument> GeneratedDocuments { get; set; }
    }
}
