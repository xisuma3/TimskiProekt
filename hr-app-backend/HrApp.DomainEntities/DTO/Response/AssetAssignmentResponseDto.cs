using System;

namespace HrApp.DomainEntities.DTO.Response
{
    public class AssetAssignmentResponseDto
    {
        public Guid AssignmentID { get; set; }

        public Guid AssetID { get; set; }
        public string AssetName { get; set; }
        public string SerialNumber { get; set; }

        public Guid EmployeeID { get; set; }
        public string EmployeeName { get; set; }

        public DateTime AssignedDate { get; set; }
        public DateTime? ReturnedDate { get; set; }
        public string Notes { get; set; }
        public string ReturnCondition { get; set; }

        /// <summary>True while this employee still holds the asset.</summary>
        public bool IsOpen => ReturnedDate == null;

        /// <summary>Whole days held; counts up to today while the assignment is open.</summary>
        public int DaysHeld => ((ReturnedDate ?? DateTime.UtcNow).Date - AssignedDate.Date).Days;
    }
}
