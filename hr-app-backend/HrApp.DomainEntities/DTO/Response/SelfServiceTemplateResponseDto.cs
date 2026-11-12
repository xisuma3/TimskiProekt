namespace HrApp.DomainEntities.DTO.Response
{
    /// <summary>
    /// A template an employee may generate for themselves. Deliberately thinner than
    /// <see cref="DocumentTemplateResponseDto"/>: no HTML body and no count of documents
    /// generated, because those reveal HR's other templates and how often they are used.
    /// </summary>
    public class SelfServiceTemplateResponseDto
    {
        public Guid TemplateID { get; set; }
        public string TemplateName { get; set; }
        public string? Description { get; set; }
        public string TemplateType { get; set; }

        /// <summary>The template lists equipment, so the employee picks which of their assets to include.</summary>
        public bool ListsAssets { get; set; }
    }
}
