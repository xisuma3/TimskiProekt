using HrApp.DomainEntities.DTO.Response;
using HrAppWebApplication.Controllers;
using Microsoft.AspNetCore.Authorization;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// The template library is HR's: every template's HTML and how many documents each one
    /// produced. Employees only see what they can generate for themselves.
    /// </summary>
    public class DocumentTemplateAccessTests
    {
        [Theory]
        [InlineData(nameof(DocumentTemplateController.GetAll))]
        [InlineData(nameof(DocumentTemplateController.GetById))]
        [InlineData(nameof(DocumentTemplateController.GetByName))]
        [InlineData(nameof(DocumentTemplateController.GetByType))]
        [InlineData(nameof(DocumentTemplateController.GetTemplateContent))]
        public void LibraryReads_AreAdminOnly(string action)
        {
            var method = typeof(DocumentTemplateController).GetMethod(action);
            var roles = method!.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>().Select(a => a.Roles);
            Assert.Contains("Admin", roles);
        }

        [Fact]
        public void SelfServiceList_IsOpenToAnySignedInUser()
        {
            var method = typeof(DocumentTemplateController).GetMethod(nameof(DocumentTemplateController.GetSelfService));
            Assert.DoesNotContain(method!.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>(),
                a => !string.IsNullOrEmpty(a.Roles));
            Assert.Empty(method.GetCustomAttributes(typeof(AllowAnonymousAttribute), true));
        }

        [Fact]
        public async Task SelfServiceList_HasOnlyOptedInTemplates_AndNoContentOrCounts()
        {
            using var h = new TestHarness();
            h.AddTemplate("<p>{{employee.firstName}}</p>", name: "Contract", allowSelfService: true);
            h.AddTemplate("<ul>{{#assetList}}<li>{{asset.name}}</li>{{/assetList}}</ul>", name: "Handover", allowSelfService: true);
            h.AddTemplate("<p>Formal warning</p>", name: "Written Warning", allowSelfService: false);

            var list = (await h.DocumentTemplateService.GetSelfServiceAsync()).OrderBy(t => t.TemplateName).ToList();

            Assert.Equal(new[] { "Contract", "Handover" }, list.Select(t => t.TemplateName));
            Assert.False(list[0].ListsAssets);
            Assert.True(list[1].ListsAssets);
            Assert.DoesNotContain(typeof(SelfServiceTemplateResponseDto).GetProperties(),
                p => p.Name is "TemplateContent" or "GeneratedDocumentsCount" or "AllowSelfService");
        }
    }
}
