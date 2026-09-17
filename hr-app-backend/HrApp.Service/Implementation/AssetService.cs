using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.DTO.Response;
using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HrApp.Service.Implementation
{
    public class AssetService : IAssetService
    {
        private readonly IAssetRepository _repository;
        private readonly IAssetAssignmentRepository _assignmentRepository;
        private readonly IEmployeeRepository _employeeRepository;

        public AssetService(
            IAssetRepository repository,
            IAssetAssignmentRepository assignmentRepository,
            IEmployeeRepository employeeRepository)
        {
            _repository = repository;
            _assignmentRepository = assignmentRepository;
            _employeeRepository = employeeRepository;
        }

        public async Task<IEnumerable<AssetResponseDto>> GetAllAsync()
        {
            var assets = await _repository.GetAllAsync();
            return assets.Select(MapToDto);
        }

        public async Task<AssetResponseDto> GetByIdAsync(Guid id)
        {
            var asset = await _repository.GetByIdAsync(id);
            return asset == null ? null : MapToDto(asset);
        }

        public async Task<AssetResponseDto> GetBySerialNumberAsync(string serialNumber)
        {
            var asset = await _repository.GetBySerialNumberAsync(serialNumber);
            return asset == null ? null : MapToDto(asset);
        }

        public async Task<IEnumerable<AssetResponseDto>> GetByEmployeeIdAsync(Guid employeeId)
        {
            var assets = await _repository.GetByEmployeeIdAsync(employeeId);
            return assets.Select(MapToDto);
        }

        public async Task<AssetResponseDto> CreateAsync(AssetRequestDto dto)
        {
            await GuardSerialNumberAvailable(dto.SerialNumber, null);

            var asset = new Asset
            {
                Name = dto.Name,
                Description = dto.Description,
                SerialNumber = dto.SerialNumber,
                IsActive = dto.IsActive
            };

            var created = await _repository.AddAsync(asset);

            // Creating an asset already assigned to someone is a create plus a handover,
            // and the handover must open a custody record like any other.
            if (dto.EmployeeID.HasValue)
            {
                await AssignAsync(created.AssetID, new AssignAssetRequestDto
                {
                    EmployeeID = dto.EmployeeID.Value,
                    Notes = "Assigned at creation"
                });
            }

            return await GetByIdAsync(created.AssetID);
        }

        /// <summary>
        /// Updates the asset's own attributes. It deliberately does not move the asset
        /// between employees — that is <see cref="AssignAsync"/>, which records custody.
        /// </summary>
        public async Task UpdateAsync(Guid id, AssetRequestDto dto)
        {
            var asset = await _repository.GetByIdAsync(id);
            if (asset == null) throw new ArgumentException("Asset not found");

            await GuardSerialNumberAvailable(dto.SerialNumber, id);

            asset.Name = dto.Name;
            asset.Description = dto.Description;
            asset.SerialNumber = dto.SerialNumber;
            asset.IsActive = dto.IsActive;

            await _repository.UpdateAsync(asset);
        }

        public async Task DeleteAsync(Guid id)
        {
            await _repository.DeleteAsync(id);
        }

        // --- Custody ---

        /// <summary>
        /// Hands the asset to an employee. Any open assignment is closed first, so the
        /// chain never has two holders at once and the previous holder is preserved.
        /// </summary>
        public async Task<AssetAssignmentResponseDto> AssignAsync(Guid assetId, AssignAssetRequestDto dto)
        {
            var asset = await _repository.GetByIdAsync(assetId);
            if (asset == null) throw new ArgumentException("Asset not found");

            var employee = await _employeeRepository.GetByIdAsync(dto.EmployeeID);
            if (employee == null) throw new ArgumentException("Employee not found");

            var assignedDate = (dto.AssignedDate ?? DateTime.UtcNow).Date;

            var open = await _assignmentRepository.GetOpenForAssetAsync(assetId);
            if (open != null)
            {
                if (open.EmployeeID == dto.EmployeeID)
                    throw new InvalidOperationException("This employee already holds the asset.");

                if (assignedDate < open.AssignedDate.Date)
                    throw new ArgumentException(
                        $"Cannot hand over on {assignedDate:yyyy-MM-dd}: the current holder received it on {open.AssignedDate:yyyy-MM-dd}.");

                // Close the previous custody period at the moment the new one starts.
                open.ReturnedDate = assignedDate;
                open.ReturnCondition ??= "Transferred";
                await _assignmentRepository.UpdateAsync(open);
            }

            var assignment = await _assignmentRepository.AddAsync(new AssetAssignment
            {
                AssetID = assetId,
                EmployeeID = dto.EmployeeID,
                AssignedDate = assignedDate,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim()
            });

            asset.EmployeeID = dto.EmployeeID;
            asset.AssignmentDate = assignedDate;
            await _repository.UpdateAsync(asset);

            assignment.Employee = employee;
            assignment.Asset = asset;
            return MapAssignmentToDto(assignment);
        }

        /// <summary>Takes the asset back into stock and closes the open custody record.</summary>
        public async Task<AssetAssignmentResponseDto> ReturnAsync(Guid assetId, ReturnAssetRequestDto dto)
        {
            var asset = await _repository.GetByIdAsync(assetId);
            if (asset == null) throw new ArgumentException("Asset not found");

            var open = await _assignmentRepository.GetOpenForAssetAsync(assetId);
            if (open == null)
                throw new InvalidOperationException("This asset is already in stock; nobody holds it.");

            var returnedDate = (dto.ReturnedDate ?? DateTime.UtcNow).Date;
            if (returnedDate < open.AssignedDate.Date)
                throw new ArgumentException(
                    $"Return date cannot precede the assignment date ({open.AssignedDate:yyyy-MM-dd}).");

            open.ReturnedDate = returnedDate;
            open.ReturnCondition = string.IsNullOrWhiteSpace(dto.ReturnCondition) ? null : dto.ReturnCondition.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Notes))
                open.Notes = string.IsNullOrWhiteSpace(open.Notes) ? dto.Notes.Trim() : $"{open.Notes}; {dto.Notes.Trim()}";

            await _assignmentRepository.UpdateAsync(open);

            asset.EmployeeID = null;
            asset.AssignmentDate = null;
            await _repository.UpdateAsync(asset);

            return MapAssignmentToDto(open);
        }

        public async Task<IEnumerable<AssetAssignmentResponseDto>> GetHistoryAsync(Guid assetId)
        {
            var history = await _assignmentRepository.GetByAssetIdAsync(assetId);
            return history.Select(MapAssignmentToDto);
        }

        public async Task<IEnumerable<AssetAssignmentResponseDto>> GetEmployeeHistoryAsync(Guid employeeId)
        {
            var history = await _assignmentRepository.GetByEmployeeIdAsync(employeeId);
            return history.Select(MapAssignmentToDto);
        }

        // --- Helpers ---

        /// <summary>
        /// Pre-checks the unique index so a duplicate serial returns 400 with a usable
        /// message rather than surfacing as a DbUpdateException / 500.
        /// </summary>
        private async Task GuardSerialNumberAvailable(string serialNumber, Guid? excludingAssetId)
        {
            if (string.IsNullOrWhiteSpace(serialNumber)) return;

            var existing = await _repository.GetBySerialNumberAsync(serialNumber);
            if (existing != null && existing.AssetID != excludingAssetId)
                throw new ArgumentException($"Serial number '{serialNumber}' is already registered to '{existing.Name}'.");
        }

        private AssetResponseDto MapToDto(Asset asset)
        {
            return new AssetResponseDto
            {
                AssetID = asset.AssetID,
                EmployeeID = asset.EmployeeID,
                EmployeeName = asset.Employee == null
                    ? null
                    : $"{asset.Employee.FirstName} {asset.Employee.LastName}",
                Name = asset.Name,
                Description = asset.Description,
                SerialNumber = asset.SerialNumber,
                AssignmentDate = asset.AssignmentDate,
                IsActive = asset.IsActive
            };
        }

        private static AssetAssignmentResponseDto MapAssignmentToDto(AssetAssignment assignment)
        {
            return new AssetAssignmentResponseDto
            {
                AssignmentID = assignment.AssignmentID,
                AssetID = assignment.AssetID,
                AssetName = assignment.Asset?.Name,
                SerialNumber = assignment.Asset?.SerialNumber,
                EmployeeID = assignment.EmployeeID,
                EmployeeName = assignment.Employee == null
                    ? null
                    : $"{assignment.Employee.FirstName} {assignment.Employee.LastName}",
                AssignedDate = assignment.AssignedDate,
                ReturnedDate = assignment.ReturnedDate,
                Notes = assignment.Notes,
                ReturnCondition = assignment.ReturnCondition
            };
        }
    }
}
