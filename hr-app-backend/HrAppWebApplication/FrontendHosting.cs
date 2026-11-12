using Microsoft.AspNetCore.StaticFiles;

namespace HrAppWebApplication;

/// <summary>
/// Serves the built React app from <c>wwwroot</c>, so one App Service hosts both the UI and
/// the API. deploy.yml copies <c>hr-app-frontend-new/build</c> there; Static Web Apps is not
/// offered in any region an Azure for Students subscription may deploy to.
/// Locally there is no wwwroot, Program.cs skips all of this, and Vite serves the UI.
/// </summary>
public static class FrontendHosting
{
    // Vite fingerprints everything under /assets, so a name never changes content and can be
    // cached for good. index.html must be revalidated on every load: a stale copy points at
    // bundles the next deploy has removed, and the page comes up blank.
    private static readonly StaticFileOptions FileOptions = new()
    {
        OnPrepareResponse = context =>
        {
            context.Context.Response.Headers.CacheControl =
                context.Context.Request.Path.StartsWithSegments("/assets")
                    ? "public, max-age=31536000, immutable"
                    : "no-cache";
        }
    };

    /// <summary>
    /// Serves index.html for "/" and the files under wwwroot. Call before UseRouting: static
    /// files are answered before authorization runs, so the login page loads without a token.
    /// </summary>
    public static IApplicationBuilder UseFrontendStaticFiles(this IApplicationBuilder app)
    {
        app.UseDefaultFiles();
        return app.UseStaticFiles(FileOptions);
    }

    /// <summary>
    /// Sends client-side routes (/dashboard, /leave-requests, a refresh on any page) to
    /// index.html. Both fallbacks need AllowAnonymous because the app's FallbackPolicy
    /// otherwise demands a token before the login page could even load.
    /// </summary>
    public static void MapFrontendFallback(this IEndpointRouteBuilder endpoints)
    {
        // An unknown /api URL stays a 404. Without this the SPA fallback would answer it with
        // index.html and a 200, and the client would fail parsing HTML as JSON instead.
        endpoints.MapFallback("api/{**rest}", NotFound).AllowAnonymous();

        // A missing file (/assets/x.js from a stale page, favicon.ico) is a 404 too: not
        // index.html served as JavaScript, and not a 401, which is what the FallbackPolicy
        // gives a request that matches no endpoint at all.
        endpoints.MapFallback("{*path:file}", NotFound).AllowAnonymous();

        // The default pattern is {*path:nonfile}: every path without a file extension.
        endpoints.MapFallbackToFile("index.html", FileOptions).AllowAnonymous();
    }

    private static Task NotFound(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }
}
