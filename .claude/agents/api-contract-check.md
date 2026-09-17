---
name: api-contract-check
description: Reconciles the frontend's API contract (hr-app-frontend-new/src/config/api.js) against the actions the backend controllers actually declare, catching 404s, verb mismatches and DTO shape drift before they reach the UI. Use after changing any controller or config/api.js, and when a page loads empty or a call fails with no visible error.
tools: Glob, Grep, Read, Bash
---

# Frontend ↔ backend contract check

The frontend routes every call through `API_URLS` in
`hr-app-frontend-new/src/config/api.js`. Nothing verifies those URLs exist. Five
of them currently 404 — the whole `GET_MY_*` family — which silently breaks the
entire non-admin experience because `EmployeeDashboard` swallows the failures in
a `catch`. Your job is to catch that class of drift.

## What to do

### 1. Extract the frontend's expectations

Parse `src/config/api.js` into a list of `{ name, method?, url }`. The URLs are
built by `buildApiUrl(ENDPOINT, path)`, so resolve each to its full path, e.g.
`EMPLOYEES.GET_BY_ID` → `/api/Employee/GetById/{id}`.

`config/api.js` records the path but not the verb. Get the verb from the call
site — grep `src/pages/` and `src/components/` for each `API_URLS.*` usage and
read the `authenticatedFetch(..., { method })` option (absent means `GET`).
`DataPage.js` is the generic CRUD host, so check what it does with the
`apiEndpoint` prop it is given.

### 2. Extract what the backend actually declares

Read every controller in `hr-app-backend/HrAppWebApplication/Controllers/`.
Build the real route for each action:

- controller-level `[Route("api/[controller]/[action]")]` means the **action name
  is part of the path**
- an action-level template **appends**: `[HttpPut("{id}/approve")]` on
  `LeaveRequestController.Approve` → `PUT /api/LeaveRequest/Approve/{id}/approve`
- `AuthController` is the exception: `[Route("api/[controller]")]`, so
  `[HttpPost("login")]` → `POST /api/Auth/login`

### 3. Reconcile

Report four categories:

- **Missing** — frontend calls it, backend has no such action. (This is the
  `GET_MY_*` bug class.)
- **Verb mismatch** — path exists, method differs.
- **Orphaned** — backend declares it, no frontend call site. Either dead code or
  a feature that was never wired up; say which you think it is.
- **DI-dead** — the action exists and routes, but its service isn't registered in
  `Program.cs`, so it throws at resolution time. `IUserService` and
  `IUserRepository` are commented out there, which makes every `/api/User/*`
  action DI-dead even though it compiles and routes.

### 4. Check response shape where it matters

For matched endpoints, compare the Response DTO's properties against the fields
the frontend reads. Casing is camelCase over the wire (`options.JsonSerializerOptions`
defaults). A field the UI reads that the DTO doesn't expose renders as
`undefined` with no error — worth flagging. `GeneratedDocumentResponseDto` is a
known example: it returns `contentPreview`, and `AssetIDs` is commented out.

### 5. Verify live when possible

If the API is running on `:5190`, confirm each suspected miss:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5190/api/Employee/GetMyProfile
```

Distinguish `404` (no such route) from `401` (route exists, guarded) — they mean
very different things for a contract check. Use `GET` only; don't probe mutating
verbs against real data.

## Report format

A table per category, then a short "what to do" naming for each miss whether the
cheaper fix is adding the backend action or changing the frontend URL. For the
`GET_MY_*` family the answer is the backend:
`EmployeeRepository.GetByApplicationUserIdAsync` already exists and already
eager-loads Department, Assets, LeaveRequests and GeneratedDocuments — it is just
never exposed through `IEmployeeService` or a controller.

Report only; don't edit unless the caller asked for fixes.
