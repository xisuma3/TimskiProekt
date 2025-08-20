using System;
using System.Collections.Generic;

namespace HrApp.DomainEntities.DTO.Request
{
    public class PreviewTemplateRequest
    {
        public string TemplateContent { get; set; }
        public Guid EmployeeId { get; set; }
        public List<Guid>? AssetIds { get; set; }
    }
}