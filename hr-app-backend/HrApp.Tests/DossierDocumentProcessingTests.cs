using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.Models;
using System;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class DossierDocumentProcessingTests
    {
        [Fact]
        public async Task SavedTemplateProcessing_LoadsAndEncodesDossierValuesAfterTrackingIsCleared()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var template = h.AddTemplate("{{employee.birthDate}}|{{employee.address}}|{{employee.emergencyContact}}|{{employee.employmentType}}");
            h.Context.EmployeeDossiers.Add(new EmployeeDossier
            {
                DossierID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                BirthDate = new DateTime(1990, 4, 3),
                Address = "<Main Street>",
                EmergencyContact = "Ada & Grace",
                EmploymentType = "Full-Time"
            });
            h.Context.SaveChanges();
            h.Context.ChangeTracker.Clear();

            var result = await h.TemplateService.ProcessTemplateAsync(template.TemplateID, employee.EmployeeID);

            Assert.Equal("1990-04-03|&lt;Main Street&gt;|Ada &amp; Grace|Full-Time", result);
        }

        [Fact]
        public async Task DirectPreviewProcessing_UsesTheSameDossierValuesAsGeneration()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            h.Context.EmployeeDossiers.Add(new EmployeeDossier
            {
                DossierID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                Address = "42 Example Road",
                EmploymentType = "Contract"
            });
            h.Context.SaveChanges();
            h.Context.ChangeTracker.Clear();

            var result = await h.TemplateService.ProcessTemplateContentForEmployeeAsync(
                "{{employee.address}}|{{employee.employmentType}}", employee.EmployeeID);

            Assert.Equal("42 Example Road|Contract", result);
        }

        [Fact]
        public async Task FinalGeneration_UsesDossierValuesAndMissingOptionalFieldsAreSafe()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var template = h.AddTemplate("{{employee.address}}|{{employee.emergencyContact}}|{{employee.employmentType}}");
            h.Context.EmployeeDossiers.Add(new EmployeeDossier
            {
                DossierID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                EmploymentType = "Part-Time"
            });
            h.Context.SaveChanges();
            h.Context.ChangeTracker.Clear();

            var generated = await h.GeneratedDocumentService.GenerateDocumentAsync(new GeneratedDocumentRequestDto
            {
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID
            });
            var content = await h.GeneratedDocumentService.GetDocumentContentAsync(generated.DocumentID);

            Assert.Equal("||Part-Time", content);
        }
    }
}
