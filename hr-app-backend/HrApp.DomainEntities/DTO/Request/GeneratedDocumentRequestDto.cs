using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Request
{
    public class GeneratedDocumentRequestDto
    {
        [Required]
        public Guid EmployeeID { get; set; }

        [Required]
        public Guid TemplateID { get; set; }

        public List<Guid> AssetIDs { get; set; } = new List<Guid>();

        public string AssetIDsJson => JsonSerializer.Serialize(AssetIDs);
    }
}
