using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.DomainEntities.Models
{
    public class EmployeeDossier
    {
        public Guid DossierID { get; set; }

        public Guid EmployeeID { get; set; }
        public Employee Employee { get; set; }

        public DateTime? BirthDate { get; set; }
        // Optional in EmployeeDossierRequestDto and nullable in the database. Declaring
        // them non-nullable here made EF reject a dossier saved without them, which
        // surfaced as an HTTP 500 rather than a saved record.
        public string? Address { get; set; }
        public string? EmergencyContact { get; set; }
        public string EmploymentType { get; set; } // "Full-Time", "Part-Time", "Contract"
    }
}
