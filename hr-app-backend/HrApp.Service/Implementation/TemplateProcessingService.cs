using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System.Text.RegularExpressions;

namespace HrApp.Service.Implementation
{
    public class TemplateProcessingService : ITemplateProcessingService
    {
        private readonly IDocumentTemplateRepository _templateRepository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly IAssetRepository _assetRepository;

        public TemplateProcessingService(
            IDocumentTemplateRepository templateRepository,
            IEmployeeRepository employeeRepository,
            IAssetRepository assetRepository)
        {
            _templateRepository = templateRepository;
            _employeeRepository = employeeRepository;
            _assetRepository = assetRepository;
        }

        public async Task<string> ProcessTemplateAsync(Guid templateId, Guid employeeId, List<Guid> assetIds = null)
        {
            var template = await _templateRepository.GetByIdAsync(templateId);
            if (template == null)
                throw new ArgumentException("Template not found");

            var employee = await _employeeRepository.GetByIdAsync(employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            List<Asset> assets = null;
            if (assetIds?.Any() == true)
            {
                assets = new List<Asset>();
                foreach (var assetId in assetIds)
                {
                    var asset = await _assetRepository.GetByIdAsync(assetId);
                    if (asset != null)
                        assets.Add(asset);
                }
            }

            return await ProcessTemplateContentAsync(template.TemplateContent, employee, assets);
        }

        public async Task<string> ProcessTemplateContentAsync(string templateContent, Employee employee, List<Asset> assets = null)
        {
            var result = templateContent;

            // Replace employee placeholders
            result = result.Replace("{{employee.firstName}}", employee.FirstName ?? "");
            result = result.Replace("{{employee.lastName}}", employee.LastName ?? "");
            result = result.Replace("{{employee.email}}", employee.Email ?? "");
            result = result.Replace("{{employee.position}}", employee.Position ?? "");
            result = result.Replace("{{employee.department}}", employee.Department?.Name ?? "");
            result = result.Replace("{{employee.hireDate}}", employee.HireDate.ToString("yyyy-MM-dd"));

            // Handle employee dossier if available
            if (employee.EmployeeDossier != null)
            {
                var dossier = employee.EmployeeDossier;
                result = result.Replace("{{employee.birthDate}}", dossier.BirthDate?.ToString("yyyy-MM-dd") ?? "");
                result = result.Replace("{{employee.address}}", dossier.Address ?? "");
                result = result.Replace("{{employee.emergencyContact}}", dossier.EmergencyContact ?? "");
                result = result.Replace("{{employee.employmentType}}", dossier.EmploymentType ?? "");
            }

            // Replace system placeholders
            result = result.Replace("{{system.currentDate}}", DateTime.Now.ToString("yyyy-MM-dd"));
            result = result.Replace("{{system.currentDateTime}}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

            // Process asset placeholders if assets are provided
            if (assets?.Any() == true)
            {
                result = ProcessAssetPlaceholders(result, assets);
            }

            return await Task.FromResult(result);
        }

        private string ProcessAssetPlaceholders(string content, List<Asset> assets)
        {
            var result = content;

            // Handle asset list placeholders
            var assetListRegex = new Regex(@"{{#assetList}}(.*?){{/assetList}}", RegexOptions.Singleline);
            var assetListMatch = assetListRegex.Match(result);
            
            if (assetListMatch.Success)
            {
                var assetTemplate = assetListMatch.Groups[1].Value;
                var assetListContent = "";

                foreach (var asset in assets)
                {
                    var assetItem = assetTemplate;
                    assetItem = assetItem.Replace("{{asset.name}}", asset.Name ?? "");
                    assetItem = assetItem.Replace("{{asset.serialNumber}}", asset.SerialNumber ?? "");
                    assetItem = assetItem.Replace("{{asset.description}}", asset.Description ?? "");
                    assetItem = assetItem.Replace("{{asset.isActive}}", asset.IsActive.ToString());
                    assetItem = assetItem.Replace("{{asset.assignmentDate}}", asset.AssignmentDate.ToString("yyyy-MM-dd"));
                    assetListContent += assetItem;
                }

                result = assetListRegex.Replace(result, assetListContent);
            }

            // Handle single asset placeholders (for first asset)
            if (assets.Any())
            {
                var firstAsset = assets.First();
                result = result.Replace("{{asset.name}}", firstAsset.Name ?? "");
                result = result.Replace("{{asset.serialNumber}}", firstAsset.SerialNumber ?? "");
                result = result.Replace("{{asset.description}}", firstAsset.Description ?? "");
                result = result.Replace("{{asset.isActive}}", firstAsset.IsActive.ToString());
                result = result.Replace("{{asset.assignmentDate}}", firstAsset.AssignmentDate.ToString("yyyy-MM-dd"));
            }

            return result;
        }
    }
}