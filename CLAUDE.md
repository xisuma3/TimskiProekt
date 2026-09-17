# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HR management application with a .NET 8 Web API backend and a React frontend. Domain covers employees, departments, assets, leave requests, employee dossiers, and document templates/generation. Auth is JWT + ASP.NET Core Identity with `Admin` and `Employee` roles.

The repository contains **three** top-level app folders:

- `hr-app-backend/` — the .NET 8 solution (`HrApp.sln`). The real backend.
- `hr-app-frontend-new/` — **the active frontend** (Create React App, JavaScript, React Bootstrap, axios). This is what the backend's CORS/API contract targets.
- `hr-app-frontend/front/` — a legacy/abandoned Vite + TypeScript + Tailwind stub with only `HomePage`/`LoginPage`/`Layout`. Do not use for feature work unless explicitly asked.

`docs/BUSINESS-FLOWS.md` maps every business process end to end and records which
ones are currently broken, with reproduction evidence. Read it before designing a
feature that touches leave, documents, or the employee self-service experience.

## Commands

### Running the app

The database must be up before the API starts — startup seeding hits Identity
tables immediately, so a stopped LocalDB fails the launch:

```bash
sqllocaldb start MSSQLLocalDB
```

### Backend (run from `hr-app-backend/`)

```bash
dotnet build HrApp.sln                                      # build all four projects
dotnet run --project HrAppWebApplication --launch-profile http
```

- **Always pass `--launch-profile http`.** Without it — or with a malformed
  profile flag — `dotnet run` ignores `launchSettings.json` and silently binds
  `http://localhost:5000` in the **Production** environment: no Swagger, and the
  frontend gets connection-refused against 5190. The failure is quiet; check the
  startup banner says `Now listening on: http://localhost:5190` and
  `Hosting environment: Development`.
- HTTP profile serves at `http://localhost:5190`; HTTPS profile at `https://localhost:7033` (and `http://localhost:5137`). Swagger UI is at `/swagger` in Development.
- The frontend (`config/api.js`) hard-defaults to `http://localhost:5190`, so use the **http** profile unless you also set `REACT_APP_API_URL`.
- There are **no test projects** in the solution and no CI (`.github/` is empty).

### Frontend (run from `hr-app-frontend-new/`)

```bash
npm install
npm start        # dev server on http://localhost:3000 (matches backend CORS allow-list)
npm run build    # production build to build/
npm test         # CRA/Jest watch mode (only the default App.test.js exists)
```

No standalone lint script — ESLint runs via `react-scripts` (`react-app` config).

### Smoke-testing a change

The seeded admin is the fastest way to exercise the API:

```bash
curl -s -X POST http://localhost:5190/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminP@ss123!"}'
```

## Backend architecture

Classic layered design, one project per layer. Dependencies flow **WebApplication → Service → Repository → DomainEntities**.

- **`HrApp.DomainEntities`** — no logic. Contains `Models/` (EF entities), `DTO/Request/` and `DTO/Response/` (separate request vs. response DTOs per resource), and `Identity/ApplicationUser.cs`.
- **`HrApp.Repository`** — EF Core data access. `HrAppDbContext.cs` plus `Interface/I*Repository.cs` + `Implementation/*Repository.cs`. Repositories own all `Include()` eager-loading; e.g. `EmployeeRepository.GetByIdAsync` pulls Department, Manager, Mentor, Assets, GeneratedDocuments, LeaveRequests.
- **`HrApp.Service`** — business logic + **manual** DTO↔entity mapping (no AutoMapper). Each service takes a repository and returns Response DTOs. `TemplateProcessingService` is the document engine.
- **`HrAppWebApplication`** — controllers, `Program.cs` (all DI, JWT, CORS, Identity, Swagger, startup seeding).

### Adding a new resource

Follow the existing pattern end to end: `Models/X.cs` + `DTO/Request/XRequestDto.cs` + `DTO/Response/XResponseDto.cs` → `DbSet<X>` and `OnModelCreating` config in `HrAppDbContext` → `IXRepository`/`XRepository` → `IXService`/`XService` (with manual mapping) → `XController` → **register both `IXRepository` and `IXService` as `AddScoped` in `Program.cs`** (this registration step is easy to forget — see gotchas).

The `new-resource` agent (`.claude/agents/`) walks this chain and checks the
registration step.

### Controllers & routing conventions

- Every controller except `AuthController` uses `[Route("api/[controller]/[action]")]`, so the **action name is part of the URL** (e.g. `GET /api/Employee/GetAll`, `POST /api/Employee/Create`). `AuthController` uses `[Route("api/[controller]")]` (→ `/api/Auth/login`, `/api/Auth/register`).
- Because the action name is already in the route, an action-level template
  **appends** to it. `[HttpPut("{id}/approve")]` on `LeaveRequestController.Approve`
  produces `PUT /api/LeaveRequest/Approve/{id}/approve` — ugly, but the frontend
  depends on exactly that shape. Don't "fix" it without updating `config/api.js`.
- Controllers are thin: resolve DTO, call the service, return the result. Keep logic out of them.

### Auth & Identity

- `HrAppDbContext` extends `IdentityDbContext<ApplicationUser>`. `ApplicationUser : IdentityUser` has a 1:1 link to `Employee` (`Employee.ApplicationUserId`).
- `AuthController.Register` creates the Identity user, assigns the `Employee` role, **and** creates the linked `Employee` record. The two writes are not in a transaction — a failed employee insert leaves an orphan login.
- `Login` returns a JWT via `GenerateJwtToken` (roles embedded as `ClaimTypes.Role`).
- JWT settings (`Key`, `Issuer`, `Audience`, `DurationInMinutes`) live in `appsettings.json` under `Jwt`. The signing key is committed to the repo.
- On startup, `Program.cs` seeds the `Admin` and `Employee` roles and a default admin: **`admin@example.com` / `AdminP@ss123!`**. This seeding is **not** gated on `IsDevelopment()`.

#### Authorization model

`Program.cs` sets a **`FallbackPolicy` requiring an authenticated user**, so an action
with no attribute is authenticated by default rather than public. Two consequences
when you add an endpoint:

- To make something public you must say so: `[AllowAnonymous]`. Only
  `AuthController`'s `login`, `register` and `logout` carry it.
- To make something admin-only you must say so: `[Authorize(Roles = "Admin")]`.
  Authenticated-but-not-admin is the default, which is right for self-service reads
  and wrong for anything that lists or mutates other people's data.

All controllers derive from **`ApiControllerBase`** (`Controllers/ApiControllerBase.cs`),
which carries `[ApiController]` + `[Authorize]` and exposes:

- `CurrentApplicationUserId` — the caller's ApplicationUser id from the token's
  `NameIdentifier` claim.
- `IsAdmin` — role check against the token, not against anything client-supplied.

**Identity comes from the token, never from the request body.** `LeaveRequestController.Create`
overwrites `dto.EmployeeID` with the caller's own employee id for non-admins, because the
caller controls the payload. Follow that pattern for any new "acting as myself" endpoint:
resolve with `IEmployeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId)`.

Role helpers in the frontend's `authService.js` (`isAdmin()`, `hasRole()`) read
`localStorage` and remain a **UI convenience only** — they decide what to render, never
what is permitted. The API is the boundary.

Verified with no token: every resource endpoint returns 401, `POST /api/Auth/login`
returns 200. Verified with an Employee-role token: the five `GetMy*` endpoints return
200 and the admin list endpoints return 403.

### Document generation

`TemplateProcessingService.ProcessTemplateContentAsync` does string/regex `{{...}}` placeholder substitution on `DocumentTemplate.TemplateContent` — e.g. `{{employee.firstName}}`, `{{employee.department}}`, `{{system.currentDate}}`, and a repeating `{{#assetList}}...{{/assetList}}` block. `GeneratedDocument.AssetIDs` is stored as an `NVARCHAR(MAX)` serialized list. `DocumentFormat.OpenXml` is referenced for Word output.

**Rules this engine now enforces** (all covered by live checks against `POST /api/DocumentTemplate/Preview`):

- **Asset ownership.** `ProcessTemplateAsync` rejects any asset whose `EmployeeID` differs
  from the document's employee, so a handover form cannot list someone else's equipment.
  `DocumentTemplateController.Preview` applies the same rule on its own DTO path.
- **Substitution is plain `string.Replace`, never `Regex.Replace`.** A replacement string
  treats `$1`/`$&` as capture references, so a template containing `$1,200` used to render
  corrupted output. If you touch `SubstitutePlaceholders`, keep it off the regex
  replacement path.
- **Every `{{#assetList}}` block is expanded with its own body** via a `MatchEvaluator`.
  The old `Regex.Match` + `Regex.Replace` pairing rendered every block using the *first*
  block's template.
- **Values are HTML-encoded** (`WebUtility.HtmlEncode`) because generated content is
  rendered through `dangerouslySetInnerHTML` on three pages.
- **Unresolved placeholders are stripped**, not printed. A missing dossier no longer
  leaves literal `{{employee.birthDate}}` in a document someone signs.

### Leave request rules

`LeaveRequestService` enforces, in this order: end date on/after start date (same-day
leave is valid — `TotalDays` counts inclusively); `LeaveType` against a fixed set
(Vacation, Sick, Parental, Unpaid); employee exists; and **no overlap** with an existing
non-rejected request for that employee.

Decisions go through one private `DecideAsync`:

- Only a **Pending** request can be decided. Re-approving, or flipping Approved to
  Rejected, returns **409 Conflict** rather than silently overwriting the audit trail.
- Nobody can decide their **own** request (409).
- Every decision records `ApprovedByEmployeeID`, `DecisionAt` and an optional
  `DecisionReason`. The approver comes from the caller's token; `ILeaveRequestService`
  takes it as an explicit parameter so a decision cannot be recorded anonymously.

Approve/Reject accept an optional `LeaveDecisionRequestDto` body (`{ "reason": "..." }`)
and still work with no body at all, which keeps older clients functioning.

### Database

- SQL Server via `DefaultConnection` in `appsettings.json` (defaults to `(localdb)\MSSQLLocalDB`, DB `HRApp`).
- **No EF migrations are committed and `Program.cs` does not call `EnsureCreated`/`Migrate`.** The schema must already exist before the app starts — startup seeds roles/admin, which needs the Identity tables present. A new `DbSet` will *not* create its table; see the next bullet for how schema changes are applied here.
- **Schema changes are applied by numbered scripts in `db/`,** not EF migrations. The
  applied migrations in `__EFMigrationsHistory` are not committed to the repo and there is
  no model snapshot, so `dotnet ef migrations add` would try to recreate the whole schema.
  Scripts are idempotent and re-runnable:
  `sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -i db/002_leave_request_decision_audit.sql`
  (use `-I` if a statement needs `QUOTED_IDENTIFIER ON`). Building a proper baseline
  migration remains the right long-term fix.
- **Deletes cascade hard.** `OnModelCreating` cascades `Employee` → `EmployeeDossier`, `LeaveRequests`, `Assets`, **and `GeneratedDocuments`**. Deleting one employee destroys their entire signed-document history. There is no soft delete. Treat any new delete path with the same suspicion.
- A legacy `Users` table still exists in the database and `Models/User.cs` still compiles, but `DbSet<User>` was removed from the context. It is dead.

## Frontend architecture (`hr-app-frontend-new`)

- **API contract**: all endpoint URLs are centralized in `src/config/api.js` (`API_URLS`). Change base URL via `REACT_APP_API_URL`.
- **Auth/session**: `src/services/authService.js` stores the JWT and `userInfo` (incl. roles) in `localStorage`. Use `authenticatedFetch(url, options)` for all authenticated calls — it injects the `Bearer` token and auto-logs-out on `401`. Role helpers: `hasRole`, `isAdmin`, `isEmployee`.
- **Routing** (`src/AppRouter.js`): public routes (`/`, `/login`, `/register`); everything else is wrapped in `ProtectedRoute` (requires token) inside `SidebarLayout`. `RoleBasedRoute allowedRoles={['Admin']}` guards Admin-only pages (`/employees`, `/departments`) and redirects others to `/dashboard`.
- **Data pages**: most list pages are built on the generic `src/components/DataPage.js` (fetch + search + add/edit modal + delete confirm). New CRUD screens should reuse it and pass a `renderCard`, `apiEndpoint`, and a `modalComponent`.
- **Role-dependent endpoints**: `AssetsPage`, `LeaveRequestsPage` and `EmployeeDosiersPage` all pick their `apiEndpoint` with `isAdmin() ? GET_ALL() : GET_MY_*()`. The `GET_MY_*` half does not exist on the backend (see gotchas).

## Gotchas

- **Self-service endpoints exist and are token-scoped.** `Employee/GetMyProfile`,
  `Asset/GetMyAssets`, `EmployeeDossier/GetMyDossier`, `GeneratedDocument/GetMyDocuments`
  and `LeaveRequest/GetMyLeaveRequests` all resolve the caller via
  `EmployeeRepository.GetByApplicationUserIdAsync` — they take no id parameter. Each
  returns a **list** (`GetMyDossier` returns 0 or 1 items) so it can back `DataPage`;
  `EmployeeDashboard` unwraps the dossier list for its single-record card.
- **An account with no linked `Employee` record is a real state.** The `GetMy*` endpoints
  return an empty list for it rather than erroring, and leave decisions are *refused* for
  it (an approval nobody can be attributed to is not an approval). Startup seeds an
  `Employee` for the dev admin so approvals are attributable.
- **`UserController` is broken at runtime.** It depends on `IUserService`, but `IUserService`/`IUserRepository` registrations are **commented out** in `Program.cs` ("not properly implemented"). Any `/api/User/*` call throws a DI resolution error. Note `authService.fetchUserDetails` calls `USER.GET_BY_ID` — so that path is dead too.
- **`HrAppDbContext` lives in the `HrApp.Repository` project but is declared under `namespace HrAppWebApplication`.** Repositories therefore `using HrAppWebApplication;` to reach the context — don't be misled by the namespace.
- **Several request DTOs have no validation attributes at all**: `DepartmentRequestDto`, `EmployeeRequestDto`, `UpdateEmployeeRequestDto`, `PreviewTemplateRequest`, `UserRequestDto`. `ModelState.IsValid` is therefore meaningless for those endpoints.
- **`EmployeeService.UpdateAsync` does not null-check** the result of `GetByIdAsync`, so editing a non-existent id throws an NRE → HTTP 500 instead of 404.
- **`AssetService.CreateAsync` doesn't validate the employee exists** and doesn't pre-check the unique `SerialNumber` index, so duplicates surface as HTTP 500 rather than a 400 with a usable message.
- `WeatherForecastController`/`WeatherForecast.cs` are leftover scaffolding.
- Committed `bin/`/`obj/` artifacts appear as modified in `git status`; they are build output, not source changes.

## Agents

Project agents live in `.claude/agents/`:

- **`authz-audit`** — sweeps every controller action for `[Authorize]` coverage and reports unguarded endpoints by blast radius. Use before shipping, and after adding any controller.
- **`api-contract-check`** — diffs `hr-app-frontend-new/src/config/api.js` against the actions the backend actually declares, catching 404s like the `GET_MY_*` family before they reach the UI.
- **`new-resource`** — scaffolds a resource through all six layers in the established pattern, including the `Program.cs` registration that is routinely forgotten.
