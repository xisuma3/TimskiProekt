using HrApp.DomainEntities.DTO.Request;
using HrApp.DomainEntities.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    public class TemplateHtmlSanitizationTests
    {
        [Fact]
        public async Task Create_SanitizesExecutableMarkupAndKeepsSupportedFormatting()
        {
            using var h = new TestHarness();

            var created = await h.DocumentTemplateService.CreateAsync(new DocumentTemplateRequestDto
            {
                TemplateName = "Safe handover",
                TemplateType = "Asset",
                TemplateContent = "<h1>Handover</h1><p><strong>{{employee.firstName}}</strong></p>" +
                    "<script>alert(1)</script><img src=\"https://example.test/logo.png\" onerror=\"alert(1)\">" +
                    "<a href=\"javascript:alert(1)\" onclick=\"alert(1)\">unsafe</a>"
            });

            Assert.Contains("<h1>Handover</h1>", created.TemplateContent);
            Assert.Contains("<strong>{{employee.firstName}}</strong>", created.TemplateContent);
            Assert.Contains("<img src=\"https://example.test/logo.png\">", created.TemplateContent);
            Assert.DoesNotContain("script", created.TemplateContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror", created.TemplateContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onclick", created.TemplateContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("javascript:", created.TemplateContent, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task PreviouslyStoredTemplate_IsSafeDuringSavedAndDirectPreview()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee("<Ada>", "Lovelace");
            var template = h.AddTemplate("<p>{{employee.firstName}}</p><iframe src=\"https://evil.test\"></iframe>" +
                "<object data=\"https://evil.test\"></object><svg onload=\"alert(1)\"></svg>");

            var savedPreview = await h.TemplateService.ProcessTemplateAsync(template.TemplateID, employee.EmployeeID);
            var directPreview = await h.TemplateService.ProcessTemplateContentForEmployeeAsync(
                "<p>{{employee.firstName}}</p><embed src=\"https://evil.test\"><a href=\"javascript:alert(1)\">x</a>",
                employee.EmployeeID);

            Assert.Equal("<p>&lt;Ada&gt;</p>", savedPreview);
            Assert.Equal("<p>&lt;Ada&gt;</p><a>x</a>", directPreview);
            Assert.DoesNotContain("iframe", savedPreview, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("object", savedPreview, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("svg", savedPreview, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("embed", directPreview, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("javascript:", directPreview, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task FinalGenerationAndExistingDocumentRead_SanitizeHtml()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var template = h.AddTemplate("<table><tr><td>{{employee.firstName}}</td></tr></table><script>alert(1)</script>");

            var generated = await h.GeneratedDocumentService.GenerateDocumentAsync(new GeneratedDocumentRequestDto
            {
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID
            });
            var generatedContent = await h.GeneratedDocumentService.GetDocumentContentAsync(generated.DocumentID);

            h.Context.GeneratedDocuments.Add(new GeneratedDocument
            {
                DocumentID = Guid.NewGuid(),
                EmployeeID = employee.EmployeeID,
                TemplateID = template.TemplateID,
                Content = "<p>old document</p><img src=x onerror=alert(1)>",
                GeneratedDate = DateTime.UtcNow
            });
            h.Context.SaveChanges();
            var legacyDocument = await h.Context.GeneratedDocuments.FirstAsync(d => d.Content.Contains("old document"));
            var legacyContent = await h.GeneratedDocumentService.GetDocumentContentAsync(legacyDocument.DocumentID);

            Assert.Equal("<table><tbody><tr><td>Ada</td></tr></tbody></table>", generatedContent);
            Assert.Equal("<p>old document</p><img src=\"x\">", legacyContent);
            Assert.DoesNotContain("script", generatedContent, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror", legacyContent, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task SafeAssetMarkupRemainsSupportedAndForeignAssetIsRejected()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var other = h.AddEmployee("Grace", "Hopper");
            var asset = h.AddAsset(employee.EmployeeID, "Laptop");
            var otherAsset = h.AddAsset(other.EmployeeID, "Tablet");
            var template = h.AddTemplate("<ul>{{#assetList}}<li>{{asset.name}}</li>{{/assetList}}</ul>");

            var content = await h.TemplateService.ProcessTemplateAsync(
                template.TemplateID, employee.EmployeeID, new List<Guid> { asset.AssetID });

            Assert.Equal("<ul><li>Laptop</li></ul>", content);
            await Assert.ThrowsAsync<ArgumentException>(() => h.TemplateService.ProcessTemplateAsync(
                template.TemplateID, employee.EmployeeID, new List<Guid> { otherAsset.AssetID }));
        }
    }
}
