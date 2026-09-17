using HrApp.DomainEntities.Models;
using HrApp.Repository.Interface;
using HrApp.Service.Interface;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace HrApp.Service.Implementation
{
    public class TemplateProcessingService : ITemplateProcessingService
    {
        // Singleline so a block can span lines; Matches (not Match) so every block is
        // expanded with its own body.
        private static readonly Regex AssetListRegex =
            new(@"{{#assetList}}(.*?){{/assetList}}", RegexOptions.Singleline | RegexOptions.Compiled);

        // Any placeholder left over after substitution, e.g. a typo or a field we have no
        // value for. These are stripped rather than printed into a document someone signs.
        private static readonly Regex LeftoverPlaceholderRegex =
            new(@"{{\s*[#/]?\s*[a-zA-Z0-9_.]+\s*}}", RegexOptions.Compiled);

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
                    if (asset == null)
                        throw new ArgumentException($"Asset {assetId} not found");

                    // A document about one employee must not list another employee's
                    // equipment. Without this check a handover form can be generated
                    // naming assets the employee never held.
                    if (asset.EmployeeID != employeeId)
                        throw new ArgumentException(
                            $"Asset '{asset.Name}' is not assigned to this employee and cannot be included.");

                    assets.Add(asset);
                }
            }

            return await ProcessTemplateContentAsync(template.TemplateContent, employee, assets);
        }

        public async Task<string> ProcessTemplateContentAsync(string templateContent, Employee employee, List<Asset> assets = null)
        {
            if (string.IsNullOrEmpty(templateContent))
                return string.Empty;

            // Asset blocks are expanded first so that placeholders inside them are resolved
            // per asset rather than against the employee.
            var result = ExpandAssetBlocks(templateContent, assets);

            var values = BuildEmployeeValues(employee);
            result = SubstitutePlaceholders(result, values);

            // Anything still unresolved would otherwise be printed verbatim into the
            // finished document.
            result = LeftoverPlaceholderRegex.Replace(result, string.Empty);

            return await Task.FromResult(result);
        }

        private static Dictionary<string, string> BuildEmployeeValues(Employee employee)
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["employee.firstName"] = employee.FirstName,
                ["employee.lastName"] = employee.LastName,
                ["employee.email"] = employee.Email,
                ["employee.position"] = employee.Position,
                ["employee.department"] = employee.Department?.Name,
                ["employee.hireDate"] = employee.HireDate.ToString("yyyy-MM-dd"),
                ["system.currentDate"] = DateTime.Now.ToString("yyyy-MM-dd"),
                ["system.currentDateTime"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            // Dossier fields resolve to empty rather than staying as literal placeholders
            // when no dossier is on file.
            var dossier = employee.EmployeeDossier;
            values["employee.birthDate"] = dossier?.BirthDate?.ToString("yyyy-MM-dd");
            values["employee.address"] = dossier?.Address;
            values["employee.emergencyContact"] = dossier?.EmergencyContact;
            values["employee.employmentType"] = dossier?.EmploymentType;

            return values;
        }

        private static Dictionary<string, string> BuildAssetValues(Asset asset)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["asset.name"] = asset.Name,
                ["asset.serialNumber"] = asset.SerialNumber,
                ["asset.description"] = asset.Description,
                ["asset.isActive"] = asset.IsActive.ToString(),
                ["asset.assignmentDate"] = asset.AssignmentDate.ToString("yyyy-MM-dd")
            };
        }

        private static string ExpandAssetBlocks(string content, List<Asset> assets)
        {
            var hasAssets = assets?.Any() == true;

            // Each block is expanded with its OWN body. Using Regex.Match for the body and
            // Regex.Replace for the whole string would render every block using the first
            // block's template.
            var result = AssetListRegex.Replace(content, match =>
            {
                if (!hasAssets) return string.Empty;

                var blockTemplate = match.Groups[1].Value;
                var builder = new StringBuilder();
                foreach (var asset in assets)
                {
                    builder.Append(SubstitutePlaceholders(blockTemplate, BuildAssetValues(asset)));
                }
                return builder.ToString();
            });

            // Single-asset placeholders outside any block refer to the first asset.
            if (hasAssets)
            {
                result = SubstitutePlaceholders(result, BuildAssetValues(assets.First()));
            }

            return result;
        }

        /// <summary>
        /// Replaces {{key}} with its value. Uses plain string replacement, never
        /// Regex.Replace, because a replacement string treats "$1"/"$&amp;" as capture
        /// references — a template containing a dollar amount would corrupt the output.
        /// Values are HTML-encoded because generated content is rendered as HTML.
        /// </summary>
        private static string SubstitutePlaceholders(string content, Dictionary<string, string> values)
        {
            var result = content;
            foreach (var pair in values)
            {
                var safeValue = WebUtility.HtmlEncode(pair.Value ?? string.Empty);
                result = result.Replace("{{" + pair.Key + "}}", safeValue);
            }
            return result;
        }
    }
}
