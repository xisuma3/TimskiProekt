using HrApp.DomainEntities.Models;

namespace HrApp.Service.Interface
{
    public interface ITemplateProcessingService
    {
        Task<string> ProcessTemplateAsync(Guid templateId, Guid employeeId, List<Guid> assetIds = null);
        Task<string> ProcessTemplateContentForEmployeeAsync(string templateContent, Guid employeeId, List<Asset> assets = null);
        Task<string> ProcessTemplateContentAsync(string templateContent, Employee employee, List<Asset> assets = null);
    }
}
