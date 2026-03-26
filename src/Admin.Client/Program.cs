using Admin.Client;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.AspNetCore.Components.WebAssembly.Authentication;
using MudBlazor.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Add MudBlazor
builder.Services.AddMudServices();

var configuredUrl = builder.Configuration["ApiBaseUrl"];
var apiBaseUrl = string.IsNullOrEmpty(configuredUrl) 
    ? builder.HostEnvironment.BaseAddress 
    : configuredUrl;

// Configure HttpClient with auth
builder.Services.AddHttpClient("Admin.API", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
})
.AddHttpMessageHandler(sp =>
{
    var handler = sp.GetRequiredService<AuthorizationMessageHandler>()
        .ConfigureHandler(
            authorizedUrls: new[] { apiBaseUrl.TrimEnd('/') },
            scopes: new[] { "api://dda42336-75a5-44df-b841-fb7e1302527d/access_as_user" });
    return handler;
});

builder.Services.AddScoped(sp => sp.GetRequiredService<IHttpClientFactory>().CreateClient("Admin.API"));

// Add MSAL authentication
builder.Services.AddMsalAuthentication(options =>
{
    builder.Configuration.Bind("AzureAd", options.ProviderOptions.Authentication);
    options.ProviderOptions.DefaultAccessTokenScopes.Add("api://dda42336-75a5-44df-b841-fb7e1302527d/access_as_user");
    options.ProviderOptions.LoginMode = "redirect";
});

await builder.Build().RunAsync();
