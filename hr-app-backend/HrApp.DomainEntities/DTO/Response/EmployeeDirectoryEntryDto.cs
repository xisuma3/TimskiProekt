using System;

namespace HrApp.DomainEntities.DTO.Response
{
    /// <summary>
    /// The minimum needed to pick a colleague (e.g. as approval cover): no email, dates,
    /// manager or dossier data. Safe for any signed-in user to read.
    /// </summary>
    public class EmployeeDirectoryEntryDto
    {
        public Guid EmployeeID { get; set; }
        public string Name { get; set; }
        public string? Position { get; set; }
        public string? DepartmentName { get; set; }
    }
}
