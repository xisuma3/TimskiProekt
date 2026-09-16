# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HR management application with a .NET 8 Web API backend and a React frontend. Domain covers employees, departments, assets, leave requests, employee dossiers, and document templates/generation. Auth is JWT + ASP.NET Core Identity with `Admin` and `Employee` roles.

The repository contains **three** top-level app folders:

- `hr-app-backend/` — the .NET 8 solution (`HrApp.sln`). The real backend.
- `hr-app-frontend-new/` — **the active frontend** (Create React App, JavaScript, React Bootstrap, axios). This is what the backend's CORS/API contract targets.
- `hr-app-frontend/front/` — a legacy/abandoned Vite + TypeScript + Tailwind stub with only `HomePage`/`LoginPage`/`Layout`. Do not use for feature work unless explicitly asked.

## Commands

### Backend (run from `hr-app-backend/`)

```bash
dotnet build HrApp.sln                          # build all four projects
dotnet run --project HrAppWebApplication        # run the API (default 'http' profile)
```

- HTTP profile serves at `http://localhost:5190`; HTTPS profile at `https://localhost:7033` (and `http://localhost:5137`). Swagger UI is at `/swagger` in Development.
- The frontend (`config/api.js`) hard-defaults to `http://localhost:5190`, so use the **http** profile unless you also set `REACT_APP_API_URL`.
- There are **no test projects** in the solution.

### Frontend (run from `hr-app-frontend-new/`)

```bash
npm install
npm start        # dev server on http://localhost:3000 (matches backend CORS allow-list)
npm run build    # production build to build/
npm test         # CRA/Jest watch mode (only the default App.test.js exists)
```

No standalone lint script — ESLint runs via `react-scripts` (`react-app` config).

## Backend architecture

Classic layered design, one project per layer. Dependencies flow **WebApplication → Service → Repository → DomainEntities**.

- **`HrApp.DomainEntities`** — no logic. Contains `Models/` (EF entities), `DTO/Request/` and `DTO/Response/` (separate request vs. response DTOs per resource), and `Identity/ApplicationUser.cs`.
- **`HrApp.Repository`** — EF Core data access. `HrAppDbContext.cs` plus `Interface/I*Repository.cs` + `Implementation/*Repository.cs`. Repositories own all `Include()` eager-loading; e.g. `EmployeeRepository.GetByIdAsync` pulls Department, Manager, Mentor, Assets, GeneratedDocuments, LeaveRequests.
- **`HrApp.Service`** — business logic + **manual** DTO↔entity mapping (no AutoMapper). Each service takes a repository and returns Response DTOs. `TemplateProcessingService` is the document engine.
- **`HrAppWebApplication`** — controllers, `Program.cs` (all DI, JWT, CORS, Identity, Swagger, startup seeding).

### Adding a new resource

Follow the existing pattern end to end: `Models/X.cs` + `DTO/Request/XRequestDto.cs` + `DTO/Response/XResponseDto.cs` → `DbSet<X>` and `OnModelCreating` config in `HrAppDbContext` → `IXRepository`/`XRepository` → `IXService`/`XService` (with manual mapping) → `XController` → **register both `IXRepository` and `IXService` as `AddScoped` in `Program.cs`** (this registration step is easy to forget — see gotchas).

### Controllers & routing conventions

- Every controller except `AuthController` uses `[Route("api/[controller]/[action]")]`, so the **action name is part of the URL** (e.g. `GET /api/Employee/GetAll`, `POST /api/Employee/Create`). `AuthController` uses `[Route("api/[controller]")]` (→ `/api/Auth/login`, `/api/Auth/register`).
- Controllers are thin: resolve DTO, call the service, return the result. Keep logic out of them.

### Auth & Identity

- `HrAppDbContext` extends `IdentityDbContext<ApplicationUser>`. `ApplicationUser : IdentityUser` has a 1:1 link to `Employee` (`Employee.ApplicationUserId`).
- `AuthController.Register` creates the Identity user, assigns the `Employee` role, **and** creates the linked `Employee` record. `Login` returns a JWT via `GenerateJwtToken` (roles embedded as `ClaimTypes.Role`).
- JWT settings (`Key`, `Issuer`, `Audience`, `DurationInMinutes`) live in `appsettings.json` under `Jwt`.
- On startup, `Program.cs` seeds the `Admin` and `Employee` roles and a default admin: **`admin@example.com` / `AdminP@ss123!`**.

### Document generation

`TemplateProcessingService.ProcessTemplateContentAsync` does string/regex `{{...}}` placeholder substitution on `DocumentTemplate.TemplateContent` — e.g. `{{employee.firstName}}`, `{{employee.department}}`, `{{system.currentDate}}`, and a repeating `{{#assetList}}...{{/assetList}}` block. `GeneratedDocument.AssetIDs` is stored as an `NVARCHAR(MAX)` serialized list. `DocumentFormat.OpenXml` is referenced for Word output.

### Database

- SQL Server via `DefaultConnection` in `appsettings.json` (defaults to `(localdb)\MSSQLLocalDB`, DB `HRApp`).
- **No EF migrations are committed and `Program.cs` does not call `EnsureCreated`/`Migrate`.** The schema must already exist (or you must add migrations with `dotnet ef migrations add <Name> --project HrApp.Repository --startup-project HrAppWebApplication` and `dotnet ef database update`). Startup only seeds roles/admin, which requires the Identity tables to exist first.

## Frontend architecture (`hr-app-frontend-new`)

- **API contract**: all endpoint URLs are centralized in `src/config/api.js` (`API_URLS`). Change base URL via `REACT_APP_API_URL`.
- **Auth/session**: `src/services/authService.js` stores the JWT and `userInfo` (incl. roles) in `localStorage`. Use `authenticatedFetch(url, options)` for all authenticated calls — it injects the `Bearer` token and auto-logs-out on `401`. Role helpers: `hasRole`, `isAdmin`, `isEmployee`.
- **Routing** (`src/AppRouter.js`): public routes (`/`, `/login`, `/register`); everything else is wrapped in `ProtectedRoute` (requires token) inside `SidebarLayout`. `RoleBasedRoute allowedRoles={['Admin']}` guards Admin-only pages (`/employees`, `/departments`) and redirects others to `/dashboard`.
- **Data pages**: most list pages are built on the generic `src/components/DataPage.js` (fetch + search + add/edit modal + delete confirm). New CRUD screens should reuse it and pass a `renderCard`, `apiEndpoint`, and a `modalComponent`.

## Gotchas

- **`UserController` is broken at runtime.** It depends on `IUserService`, but `IUserService`/`IUserRepository` registrations are **commented out** in `Program.cs` ("not properly implemented"). Any `/api/User/*` call throws a DI resolution error. Register the services (and verify the implementations) before relying on them.
- **Frontend references self-service endpoints the backend may not implement.** `config/api.js` calls `GetMyProfile`, `GetMyAssets`, `GetMyDossier`, `GetMyDocuments`, `GetMyLeaveRequests`, and leave `Approve`/`Reject`, but the current controllers don't all define these actions. Verify an endpoint exists in the relevant controller before wiring UI to it.
- **`HrAppDbContext` lives in the `HrApp.Repository` project but is declared under `namespace HrAppWebApplication`.** Repositories therefore `using HrAppWebApplication;` to reach the context — don't be misled by the namespace.
- Committed `bin/`/`obj/` artifacts appear as modified in `git status`; they are build output, not source changes.
