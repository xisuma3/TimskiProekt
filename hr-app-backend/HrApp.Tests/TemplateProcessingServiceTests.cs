using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// Regression cover for the four defects the template engine shipped with. Each of
    /// these produced a wrong or corrupted document that somebody would then sign.
    /// </summary>
    public class TemplateProcessingServiceTests
    {
        [Fact]
        public async Task DollarAmountInAssetBlock_IsNotTreatedAsARegexBackreference()
        {
            // The rendered asset rows used to be passed as the *replacement* argument to
            // Regex.Replace, where "$1" means capture group 1. A template quoting a price
            // therefore duplicated the block and mangled the number.
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var asset = h.AddAsset(employee.EmployeeID, "Laptop");
            var template = h.AddTemplate("{{#assetList}}{{asset.name}} - replacement cost $1,200 USD{{/assetList}}");

            var result = await h.TemplateService.ProcessTemplateAsync(
                template.TemplateID, employee.EmployeeID, new List<Guid> { asset.AssetID });

            Assert.Equal("Laptop - replacement cost $1,200 USD", result);
        }

        [Theory]
        [InlineData("$&")]
        [InlineData("$1")]
        [InlineData("$$")]
        [InlineData("$`")]
        public async Task RegexReplacementTokens_SurviveVerbatim(string token)
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var asset = h.AddAsset(employee.EmployeeID, "Monitor");
            var template = h.AddTemplate("{{#assetList}}{{asset.name}} " + token + " end{{/assetList}}");

            var result = await h.TemplateService.ProcessTemplateAsync(
                template.TemplateID, employee.EmployeeID, new List<Guid> { asset.AssetID });

            Assert.Equal($"Monitor {token} end", result);
        }

        [Fact]
        public async Task EachAssetListBlock_RendersWithItsOwnTemplate()
        {
            // Regex.Match found only the first block, but Regex.Replace then substituted
            // *every* block with that first block's output.
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var a1 = h.AddAsset(employee.EmployeeID, "Laptop", "SN-1");
            var a2 = h.AddAsset(employee.EmployeeID, "Chair", "SN-2");
            var template = h.AddTemplate(
                "A:{{#assetList}}[{{asset.name}}]{{/assetList}}|B:{{#assetList}}<{{asset.serialNumber}}>{{/assetList}}");

            var result = await h.TemplateService.ProcessTemplateAsync(
                template.TemplateID, employee.EmployeeID, new List<Guid> { a1.AssetID, a2.AssetID });

            Assert.Equal("A:[Laptop][Chair]|B:<SN-1><SN-2>", result);
        }

        [Fact]
        public async Task AssetBelongingToAnotherEmployee_IsRejected()
        {
            using var h = new TestHarness();
            var owner = h.AddEmployee("Ada", "Lovelace");
            var other = h.AddEmployee("Grace", "Hopper");
            var othersAsset = h.AddAsset(other.EmployeeID, "Laptop");
            var template = h.AddTemplate("{{#assetList}}{{asset.name}}{{/assetList}}");

            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                h.TemplateService.ProcessTemplateAsync(
                    template.TemplateID, owner.EmployeeID, new List<Guid> { othersAsset.AssetID }));

            Assert.Contains("not assigned to this employee", ex.Message);
        }

        [Fact]
        public async Task UnresolvedPlaceholders_AreStrippedNotPrinted()
        {
            // A missing dossier or a typo used to leave literal "{{employee.salary}}" text
            // in the finished document.
            using var h = new TestHarness();
            var employee = h.AddEmployee("Ada", "Lovelace");
            var template = h.AddTemplate("Name: {{employee.firstName}} Salary: {{employee.salary}} DOB: {{employee.birthDate}}|");

            var result = await h.TemplateService.ProcessTemplateAsync(template.TemplateID, employee.EmployeeID, null);

            Assert.Equal("Name: Ada Salary:  DOB: |", result);
            Assert.DoesNotContain("{{", result);
        }

        [Fact]
        public async Task SubstitutedValues_AreHtmlEncoded()
        {
            // Generated content is rendered through dangerouslySetInnerHTML on three pages.
            using var h = new TestHarness();
            var employee = h.AddEmployee("<script>alert(1)</script>", "Lovelace");
            var template = h.AddTemplate("<p>{{employee.firstName}}</p>");

            var result = await h.TemplateService.ProcessTemplateAsync(template.TemplateID, employee.EmployeeID, null);

            Assert.Equal("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>", result);
            Assert.DoesNotContain("<script>", result);
        }

        [Fact]
        public async Task AssetListBlock_WithNoAssets_CollapsesToNothing()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var template = h.AddTemplate("start{{#assetList}}{{asset.name}}{{/assetList}}end");

            var result = await h.TemplateService.ProcessTemplateAsync(template.TemplateID, employee.EmployeeID, null);

            Assert.Equal("startend", result);
        }

        [Fact]
        public async Task MissingTemplateOrEmployee_ThrowsArgumentException()
        {
            using var h = new TestHarness();
            var employee = h.AddEmployee();
            var template = h.AddTemplate("hello");

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.TemplateService.ProcessTemplateAsync(Guid.NewGuid(), employee.EmployeeID, null));

            await Assert.ThrowsAsync<ArgumentException>(() =>
                h.TemplateService.ProcessTemplateAsync(template.TemplateID, Guid.NewGuid(), null));
        }
    }
}
