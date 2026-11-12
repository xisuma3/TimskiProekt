using HrAppWebApplication;
using HrAppWebApplication.Controllers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net;
using Xunit;

namespace HrApp.Tests
{
    /// <summary>
    /// The deployed app serves the React build from wwwroot next to the API. These run the
    /// same middleware order as Program.cs, with its deny-by-default FallbackPolicy, against a
    /// throwaway wwwroot.
    /// </summary>
    public sealed class FrontendHostingTests : IDisposable
    {
        private const string IndexMarker = "<div id=\"root\"></div>";
        private readonly string _contentRoot;
        private readonly TestServer _server;

        public FrontendHostingTests()
        {
            _contentRoot = Path.Combine(Path.GetTempPath(), "hrapp-frontend-" + Guid.NewGuid().ToString("N"));
            var webRoot = Path.Combine(_contentRoot, "wwwroot");
            Directory.CreateDirectory(Path.Combine(webRoot, "assets"));
            File.WriteAllText(Path.Combine(webRoot, "index.html"), $"<!doctype html><html><body>{IndexMarker}</body></html>");
            File.WriteAllText(Path.Combine(webRoot, "assets", "index-abc123.js"), "console.log('app');");

            _server = new TestServer(new WebHostBuilder()
                .UseEnvironment("Testing")
                .UseContentRoot(_contentRoot)
                .UseWebRoot(webRoot)
                .ConfigureServices(services =>
                {
                    services.AddAuthentication("Anonymous").AddScheme<AuthenticationSchemeOptions, AnonymousHandler>("Anonymous", _ => { });
                    services.AddAuthorization(options =>
                        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
                    services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
                })
                .Configure(app =>
                {
                    app.UseFrontendStaticFiles();
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapControllers();
                        endpoints.MapFrontendFallback();
                    });
                }));
        }

        [Fact]
        public async Task Root_ServesIndexWithoutAToken_AndIsRevalidated()
        {
            var response = await _server.CreateClient().GetAsync("/");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains(IndexMarker, await response.Content.ReadAsStringAsync());
            Assert.True(response.Headers.CacheControl?.NoCache);
        }

        [Theory]
        [InlineData("/dashboard")]
        [InlineData("/leave-requests")]
        [InlineData("/employees/some-id")]
        public async Task ClientSideRoute_ServesIndexWithoutAToken(string path)
        {
            var response = await _server.CreateClient().GetAsync(path);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains(IndexMarker, await response.Content.ReadAsStringAsync());
            Assert.True(response.Headers.CacheControl?.NoCache);
        }

        [Fact]
        public async Task FingerprintedAsset_IsCachedForGood()
        {
            var response = await _server.CreateClient().GetAsync("/assets/index-abc123.js");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("immutable", response.Headers.CacheControl!.Extensions.Select(e => e.Name));
            Assert.Equal(TimeSpan.FromDays(365), response.Headers.CacheControl.MaxAge);
        }

        [Fact]
        public async Task MissingAsset_Is404_NotIndexServedAsJavaScript()
        {
            var response = await _server.CreateClient().GetAsync("/assets/index-gone99.js");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("GET", "/api/Nope/Missing")]
        [InlineData("GET", "/api/Auth/login")] // exists, but only as POST
        public async Task ApiUrlWithNoEndpoint_Is404_NotIndex(string method, string path)
        {
            var response = await _server.CreateClient().SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(IndexMarker, await response.Content.ReadAsStringAsync());
        }

        [Fact]
        public async Task ExistingApiEndpoint_StillRequiresAToken()
        {
            var response = await _server.CreateClient().GetAsync("/api/Employee/GetAll");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        public void Dispose()
        {
            _server.Dispose();
            try { Directory.Delete(_contentRoot, recursive: true); } catch (IOException) { }
        }

        /// <summary>Never authenticates, so every request is anonymous.</summary>
        private sealed class AnonymousHandler : AuthenticationHandler<AuthenticationSchemeOptions>
        {
            public AnonymousHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, Microsoft.Extensions.Logging.ILoggerFactory logger, System.Text.Encodings.Web.UrlEncoder encoder)
                : base(options, logger, encoder) { }

            protected override Task<AuthenticateResult> HandleAuthenticateAsync() => Task.FromResult(AuthenticateResult.NoResult());
        }
    }
}
