---
name: new-resource
description: Scaffolds a new resource end to end through all six layers of the HrApp backend (model, DTOs, DbContext config, repository, service, controller, Program.cs registration) following the established pattern, then verifies it builds and routes. Use when adding a new entity or CRUD resource to the backend.
tools: Glob, Grep, Read, Edit, Write, Bash
---

# Add a resource to the HrApp backend

This solution is a strict layered design with **manual** DTO↔entity mapping and
no AutoMapper. Adding a resource touches six places. The sixth — DI registration
— is the one that gets forgotten, and the failure is a runtime DI exception, not
a compile error. `UserController` is the standing example: it compiles, it
routes, and every call to it throws.

## The chain

Work in this order, reading the nearest existing sibling first and matching it
closely. `Asset` is a good compact template; `Employee` is the richest.

**1. Model** — `HrApp.DomainEntities/Models/X.cs`
`Guid XID` primary key. Navigation properties both ways. No logic, no attributes
beyond what the siblings use.

**2. DTOs** — `HrApp.DomainEntities/DTO/Request/XRequestDto.cs` and
`DTO/Response/XResponseDto.cs`
Separate request and response types, always. Response DTOs flatten relations to
names (`DepartmentName`, `EmployeeName`) rather than nesting entities.
**Add validation attributes** (`[Required]`, `[StringLength]`, `[EmailAddress]`) —
several existing request DTOs have none, which makes `ModelState.IsValid`
meaningless for them. Don't copy that.

**3. DbContext** — `HrApp.Repository/HrAppDbContext.cs`
Add `public DbSet<X> Xs { get; set; }` and a configuration block in
`OnModelCreating`. Note the file lives in `HrApp.Repository` but is declared
`namespace HrAppWebApplication`.

Be deliberate about `OnDelete`. The existing model cascades `Employee` → dossier,
leave requests, assets **and generated documents**, which means deleting an
employee destroys signed-document history. Prefer `DeleteBehavior.Restrict` for
anything that represents a record of fact.

**4. Repository** — `Interface/IXRepository.cs` + `Implementation/XRepository.cs`
Repositories own **all** `Include()` eager-loading — services never touch
`DbContext`. Match the granularity of `EmployeeRepository`: `GetByIdAsync` pulls
the full graph the callers need.

**5. Service** — `Interface/IXService.cs` + `Implementation/XService.cs`
Business rules plus hand-written mapping in both directions. Validate here, not
in the controller: existence of referenced entities, uniqueness that the DB
enforces with an index (pre-check it so callers get a 400, not a 500), and any
state-machine rules. Throw `ArgumentException` for validation failures — the
controllers catch it and translate to `BadRequest`.

Null-check anything you fetch before dereferencing; `EmployeeService.UpdateAsync`
doesn't, and returns a 500 for a bad id.

**6. Controller** — `HrAppWebApplication/Controllers/XController.cs`
Derive from **`ApiControllerBase`** (not `ControllerBase`) and add
`[Route("api/[controller]/[action]")]`. The base carries `[ApiController]` +
`[Authorize]` and gives you `CurrentApplicationUserId` and `IsAdmin`. Thin:
resolve DTO, call service, return. **The action name is part of the URL**, so
`GET /api/X/GetAll`.

`Program.cs` sets a `FallbackPolicy` requiring an authenticated user, so the
default is authenticated-but-not-admin. Add `[Authorize(Roles = "Admin")]` on
anything that lists or mutates other people's data, and `[AllowAnonymous]` only
where a route genuinely must be public. See the `authz-audit` agent.

For a "my X" endpoint, resolve the caller with
`IEmployeeService.GetByApplicationUserIdAsync(CurrentApplicationUserId)` and take
no id parameter — never trust an id from the request body to identify the caller.

**7. Register in `Program.cs`** — the step that gets missed:

```csharp
builder.Services.AddScoped<IXRepository, XRepository>();
builder.Services.AddScoped<IXService, XService>();
```

Put it with the other registrations, not at the end.

## Then verify

Build, and prove the route actually resolves — don't stop at compiling:

```bash
sqllocaldb start MSSQLLocalDB
cd hr-app-backend && dotnet build HrApp.sln
dotnet run --project HrAppWebApplication --launch-profile http
```

Confirm the banner says `http://localhost:5190` and `Hosting environment:
Development` — without `--launch-profile http` it silently binds :5000 in
Production. Then:

```bash
TOKEN=$(curl -s -X POST http://localhost:5190/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminP@ss123!"}' \
  | grep -o '"token": *"[^"]*"' | sed 's/.*: *"//;s/"$//')
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
  http://localhost:5190/api/X/GetAll
```

A `500` here is usually the missing DI registration.

## Schema

No EF migrations are committed and `Program.cs` never calls `Migrate()`, so a new
`DbSet` will **not** create its table.

`dotnet ef migrations add` is not the answer here: the applied migrations in
`__EFMigrationsHistory` are absent from the repo and there is no model snapshot,
so it would generate a migration that recreates the entire schema. There is also
no `Microsoft.EntityFrameworkCore.Design` package.

Instead add a numbered, idempotent script to `db/` following
`002_leave_request_decision_audit.sql` — guard each change with an
`IF NOT EXISTS` check so it can be re-run — and apply it:

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -I -i db/00N_your_change.sql
```

(`-I` sets `QUOTED_IDENTIFIER ON`, which some statements require.) Then say
plainly in your report that the script must be run on every environment. Don't
leave this implicit.

## If the frontend needs it

Add the URLs to `hr-app-frontend-new/src/config/api.js` under `API_URLS`, and
build the page on the generic `src/components/DataPage.js` (pass `renderCard`,
`apiEndpoint`, `modalComponent`). Then run the `api-contract-check` agent.

## Report

State what you created, the exact routes now available, whether the table exists,
and the auth attributes you applied. Call out anything you deliberately left for
the caller.
