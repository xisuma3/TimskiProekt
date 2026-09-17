using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Request
{
    public class AssetRequestDto
    {
        // Optional: an asset can be created into stock and assigned later.
        public Guid? EmployeeID { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [StringLength(100)]
        public string SerialNumber { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
