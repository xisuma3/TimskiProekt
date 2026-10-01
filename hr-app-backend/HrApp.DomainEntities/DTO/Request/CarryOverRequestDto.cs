using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HrApp.DomainEntities.DTO.Request
{
    /// <summary>
    /// Year-end carry-over: move each employee's unused days from <see cref="FromYear"/>
    /// into the next year's allowance, capped at <see cref="MaxDays"/>.
    /// </summary>
    public class CarryOverRequestDto
    {
        [Range(2000, 2099)]
        public int FromYear { get; set; }

        /// <summary>The most any one employee may carry over (policy cap).</summary>
        [Range(0, 366)]
        public decimal MaxDays { get; set; }

        /// <summary>Which leave types carry over. Defaults to Vacation only.</summary>
        public List<string>? LeaveTypes { get; set; }

        /// <summary>When true, work out the result without saving anything.</summary>
        public bool Preview { get; set; }
    }
}
