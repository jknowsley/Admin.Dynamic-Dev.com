# Admin.Dynamic-Dev.com

Admin panel for tracking AI conversations, tasks, code snippets, and decisions.

## Tech Stack

- **Frontend:** Blazor WebAssembly
- **Backend:** ASP.NET Core Web API
- **UI Framework:** MudBlazor
- **Database:** Azure SQL Server
- **Authentication:** Azure AD (Entra ID)
- **Hosting:** Azure App Service

## Features

- ✅ Browse conversations by project and date
- ✅ Full-text search across all conversations
- ✅ Project management (CRUD)
- ✅ Azure AD authentication
- 🔲 Automatic data import from OpenClaw
- 🔲 Task tracking
- 🔲 Code snippet library
- 🔲 Decision log

## Getting Started

### Prerequisites

- .NET 8 SDK
- Azure subscription
- Azure AD app registration

### Azure AD Setup

1. Register app in Azure AD (Entra ID)
2. Add redirect URIs:
   - `https://localhost:5001/authentication/login-callback` (dev)
   - `https://admin.dynamic-dev.com/authentication/login-callback` (prod)
3. Expose an API scope: `api://{client-id}/access_as_user`

### Database Setup

Run the SQL script in `database/001-initial-schema.sql` against your Azure SQL database.

### Local Development

```bash
# Start the API
cd src/Admin.Server
dotnet run

# Start the Client (in another terminal)
cd src/Admin.Client
dotnet run
```

### Configuration

**Client (`wwwroot/appsettings.json`):**
```json
{
  "AzureAd": {
    "Authority": "https://login.microsoftonline.com/{tenant-id}",
    "ClientId": "{client-id}"
  },
  "ApiBaseUrl": "https://localhost:5002"
}
```

**Server (`appsettings.json`):**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "your-connection-string"
  },
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "{tenant-id}",
    "ClientId": "{client-id}"
  }
}
```

## Project Structure

```
Admin.Dynamic-Dev.com/
├── src/
│   ├── Admin.Client/        # Blazor WASM frontend
│   ├── Admin.Server/        # ASP.NET Core API
│   └── Admin.Shared/        # Shared models
├── database/                # SQL scripts
├── tests/                   # Unit/integration tests
└── README.md
```

## License

Private - All rights reserved.
