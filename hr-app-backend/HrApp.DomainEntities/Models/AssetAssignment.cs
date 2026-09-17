using System;

namespace HrApp.DomainEntities.Models
{
    /// <summary>
    /// One period during which an asset was held by an employee.
    ///
    /// <see cref="Asset.EmployeeID"/> only records who holds an asset *now*; reassigning
    /// used to overwrite it and lose the previous holder entirely. This is the custody
    /// chain: the open assignment (<see cref="ReturnedDate"/> is null) is the current
    /// holder, and closed ones are history.
    /// </summary>
    public class AssetAssignment
    {
        public Guid AssignmentID { get; set; }

        public Guid AssetID { get; set; }
        public Asset Asset { get; set; }

        public Guid EmployeeID { get; set; }
        public Employee Employee { get; set; }

        public DateTime AssignedDate { get; set; }

        /// <summary>Null while the employee still holds the asset.</summary>
        public DateTime? ReturnedDate { get; set; }

        /// <summary>Why it moved — "new starter", "returned on exit", "swapped for M3".</summary>
        public string? Notes { get; set; }

        /// <summary>Condition recorded when the asset came back.</summary>
        public string? ReturnCondition { get; set; }

        public bool IsOpen => ReturnedDate == null;
    }
}
