using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.Models
{
    public class Asset
    {
        public Guid AssetID { get; set; }

        // Nullable: an asset in stock, or one that has been returned, is held by nobody.
        // This is the *current* holder only — the full chain lives in Assignments.
        public Guid? EmployeeID { get; set; }

        public Employee? Employee { get; set; }

        public string Name { get; set; }

        // Optional in AssetRequestDto and nullable in the database. Declaring them
        // non-nullable here made EF reject an asset created without them, surfacing as a
        // DbUpdateException / HTTP 500 rather than a saved record.
        public string? Description { get; set; }
        public string? SerialNumber { get; set; }

        /// <summary>When the current holder received it. Null when unassigned.</summary>
        public DateTime? AssignmentDate { get; set; }

        /// <summary>Whether the asset is in service at all (not whether it is assigned).</summary>
        public bool IsActive { get; set; }

        public ICollection<AssetAssignment> Assignments { get; set; }
    }
}
