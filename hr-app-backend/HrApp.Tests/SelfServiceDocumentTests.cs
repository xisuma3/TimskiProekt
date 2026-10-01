using HrApp.DomainEntities.DTO.Request;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// Employees generating documents about themselves: only from templates an admin has
    /// opted in, and only ever describing the caller and the assets they hold.
    /// </summary>
    public class SelfServiceDocumentTests
    {
        [Fact]
        public async Task SelfServiceTemplate_GeneratesADocumentAboutTheCaller()
        {
            using var h = new TestHarness();
            var me = h.AddEmployee("Ada", "Lovelace");
            var template = h.AddTemplate("<p>{{employee.firstName}} {{employee.lastName}} is employed here.</p>",
                name: "Employment Confirmation", allowSelfService: true);

            var doc = await h.GeneratedDocumentService.GenerateSelfServiceAsync(me.EmployeeID, template.TemplateID, null);

            Assert.Equal(me.EmployeeID, doc.EmployeeID);
            var content = await h.GeneratedDocumentService.GetDocumentContentAsync(doc.DocumentID);
            Assert.Contains("Ada Lovelace is employed here.", content);
        }

        [Fact]
        public async Task HrOnlyTemplate_IsRefused_AndNothingIsStored()
        {
            using var h = new TestHarness();
            var me = h.AddEmployee();
            var template = h.AddTemplate("<p>Salary letter</p>", name: "Salary Adjustment");

            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                h.GeneratedDocumentService.GenerateSelfServiceAsync(me.EmployeeID, template.TemplateID, null));

            Assert.Contains("only be issued by HR", ex.Message);
            Assert.Empty(await h.GeneratedDocumentService.GetByEmployeeIdAsync(me.EmployeeID));
        }

        [Fact]
        public async Task SomeoneElsesAsset_IsRejected()
        {
            using var h = new TestHarness();
            var me = h.AddEmployee("Ada", "Lovelace");
            var colleague = h.AddEmployee("Grace", "Hopper");
            var theirLaptop = h.AddAsset(colleague.EmployeeID, "Their laptop");
            var template = h.AddTemplate("{{#assetList}}<li>{{asset.name}}</li>{{/assetList}}", allowSelfService: true);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.GeneratedDocumentService.GenerateSelfServiceAsync(
                    me.EmployeeID, template.TemplateID, new List<Guid> { theirLaptop.AssetID }));
        }

        [Fact]
        public async Task OwnAsset_IsListed()
        {
            using var h = new TestHarness();
            var me = h.AddEmployee();
            var myLaptop = h.AddAsset(me.EmployeeID, "ThinkPad X1");
            var template = h.AddTemplate("{{#assetList}}<li>{{asset.name}}</li>{{/assetList}}", allowSelfService: true);

            var doc = await h.GeneratedDocumentService.GenerateSelfServiceAsync(
                me.EmployeeID, template.TemplateID, new List<Guid> { myLaptop.AssetID });

            var content = await h.GeneratedDocumentService.GetDocumentContentAsync(doc.DocumentID);
            Assert.Contains("ThinkPad X1", content);
        }

        [Fact]
        public async Task UnknownTemplate_IsABadRequestNotAForbidden()
        {
            using var h = new TestHarness();
            var me = h.AddEmployee();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.GeneratedDocumentService.GenerateSelfServiceAsync(me.EmployeeID, Guid.NewGuid(), null));
        }

        [Fact]
        public async Task SelfServiceFlag_RoundTripsThroughCreateAndUpdate()
        {
            using var h = new TestHarness();
            var created = await h.DocumentTemplateService.CreateAsync(new DocumentTemplateRequestDto
            {
                TemplateName = "Employment Confirmation",
                Description = "For banks and visas",
                TemplateContent = "<p>{{employee.firstName}}</p>",
                TemplateType = "Employment",
                AllowSelfService = true
            });
            Assert.True(created.AllowSelfService);

            await h.DocumentTemplateService.UpdateAsync(created.TemplateID, new DocumentTemplateRequestDto
            {
                TemplateName = "Employment Confirmation",
                TemplateContent = "<p>{{employee.firstName}}</p>",
                TemplateType = "Employment",
                AllowSelfService = false
            });
            var reloaded = (await h.DocumentTemplateService.GetAllAsync()).Single(t => t.TemplateID == created.TemplateID);
            Assert.False(reloaded.AllowSelfService);
        }
    }
}
