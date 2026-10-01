using Ganss.Xss;
using HrApp.Service.Interface;

namespace HrApp.Service.Implementation
{
    public class TemplateHtmlSanitizer : ITemplateHtmlSanitizer
    {
        public string Sanitize(string html)
        {
            return string.IsNullOrEmpty(html) ? string.Empty : CreateSanitizer().Sanitize(html);
        }

        private static HtmlSanitizer CreateSanitizer()
        {
            var sanitizer = new HtmlSanitizer();

            sanitizer.AllowedTags.Clear();
            sanitizer.AllowedTags.UnionWith(new[]
            {
                "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
                "hr", "i", "img", "li", "ol", "p", "pre", "small", "span", "strong", "sub", "sup",
                "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"
            });

            sanitizer.AllowedAttributes.Clear();
            sanitizer.AllowedAttributes.UnionWith(new[]
            {
                "alt", "class", "colspan", "href", "rel", "rowspan", "src", "style", "title"
            });

            sanitizer.AllowedSchemes.Clear();
            sanitizer.AllowedSchemes.UnionWith(new[] { "http", "https", "mailto" });

            return sanitizer;
        }
    }
}
