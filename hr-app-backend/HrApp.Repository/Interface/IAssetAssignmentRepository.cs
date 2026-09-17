using HrApp.DomainEntities.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HrApp.Repository.Interface
{
    public interface IAssetAssignmentRepository
    {
        /// <summary>Full custody chain for one asset, newest first.</summary>
        Task<IEnumerable<AssetAssignment>> GetByAssetIdAsync(Guid assetId);

        /// <summary>Everything one employee has ever held, newest first.</summary>
        Task<IEnumerable<AssetAssignment>> GetByEmployeeIdAsync(Guid employeeId);

        /// <summary>The open assignment for an asset, or null when it is in stock.</summary>
        Task<AssetAssignment> GetOpenForAssetAsync(Guid assetId);

        Task<AssetAssignment> AddAsync(AssetAssignment assignment);
        Task UpdateAsync(AssetAssignment assignment);
    }
}
