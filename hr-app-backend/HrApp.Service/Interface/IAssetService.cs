using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Interface
{
    public interface IAssetService
    {
        Task<IEnumerable<AssetResponseDto>> GetAllAsync();
        Task<AssetResponseDto> GetByIdAsync(Guid id);
        Task<AssetResponseDto> GetBySerialNumberAsync(string serialNumber);
        Task<IEnumerable<AssetResponseDto>> GetByEmployeeIdAsync(Guid employeeId);
        Task<AssetResponseDto> CreateAsync(AssetRequestDto dto);
        Task UpdateAsync(Guid id, AssetRequestDto dto);
        Task DeleteAsync(Guid id);

        // --- Custody ---
        Task<AssetAssignmentResponseDto> AssignAsync(Guid assetId, AssignAssetRequestDto dto);
        Task<AssetAssignmentResponseDto> ReturnAsync(Guid assetId, ReturnAssetRequestDto dto);
        Task<IEnumerable<AssetAssignmentResponseDto>> GetHistoryAsync(Guid assetId);
        Task<IEnumerable<AssetAssignmentResponseDto>> GetEmployeeHistoryAsync(Guid employeeId);
    }
}
