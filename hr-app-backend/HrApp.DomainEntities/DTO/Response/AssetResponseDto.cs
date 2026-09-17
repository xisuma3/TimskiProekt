using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.DTO.Response
{
    public class AssetResponseDto
    {
        public Guid AssetID { get; set; }
        public Guid? EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string SerialNumber { get; set; }
        public DateTime? AssignmentDate { get; set; }
        public bool IsActive { get; set; }

        /// <summary>False when the asset is in stock — nobody currently holds it.</summary>
        public bool IsAssigned => EmployeeID.HasValue;
    }
}
