# Security & correctness fixes — 2026-09-17

Record of the four fixes applied after the audit in
[`BUSINESS-FLOWS.md`](BUSINESS-FLOWS.md). Every claim here was verified against the
running app (backend `:5190`, frontend `:3000`), not by reading code.

Scope: backend authorization, employee self-service, the document template engine,
and the leave-request decision trail. 23 files changed, 2 added, +716/−154.

---

## 1. Authorization — the API is now the boundary

**Before:** `[Authorize]` appeared exactly once in the whole solution, on
`DepartmentController.GetAll`. Everything else was anonymous, and role checks lived
only in the browser (`authService.isAdmin()` reading `localStorage`).

**Change:**

- `Program.cs` sets a `FallbackPolicy` requiring an authenticated user, so an action
  with no attribute is authenticated rather than public.
- New `Controllers/ApiControllerBase.cs` carries `[ApiController]` + `[Authorize]` and
  exposes `CurrentApplicationUserId` (from the token's `NameIdentifier` claim) and
  `IsAdmin`. All controllers derive from it.
- Admin surfaces carry `[Authorize(Roles = "Admin")]`. Only `login`, `register` and
  `logout` are `[AllowAnonymous]`.
- Admin seeding is gated on `IsDevelopment()` — a well-known password should never be
  seeded in a deployed environment.

**Verified, with no token:**

| Endpoint | Before | After |
|---|---|---|
| `GET /api/Employee/GetAll` | 200 | **401** |
| `GET /api/EmployeeDossier/GetAll` | 200 (PII) | **401** |
| `GET /api/GeneratedDocument/GetAll` | 200 | **401** |
| `GET /api/DocumentTemplate/GetAll` | 200 | **401** |
| `GET /api/Asset/GetAll` | 200 | **401** |
| `GET /api/LeaveRequest/GetAll` | 200 | **401** |
| `GET /api/Department/GetAll` | 401 | **401** |
| `DELETE /api/Employee/Delete/{id}` | **204** | **401** |
| `POST /api/Auth/login` | 200 | **200** (must not break) |

---

## 2. Employee self-service — identity comes from the token

**Before:** the frontend was fully built for self-service (nav relabelled to "My
Assets", `EmployeeDashboard`, `isAdmin() ? GET_ALL() : GET_MY_*()`), but all five
`GetMy*` endpoints returned **404**. Every non-admin saw an empty app, because the
failures were swallowed in `catch`.

**Change:** added `IEmployeeService.GetByApplicationUserIdAsync` (wrapping the
repository method that already existed and already eager-loaded the right graph), and
five endpoints that resolve the caller from the token and take **no id parameter**:

- `Employee/GetMyProfile`
- `Asset/GetMyAssets`
- `EmployeeDossier/GetMyDossier`
- `GeneratedDocument/GetMyDocuments`
- `LeaveRequest/GetMyLeaveRequests`

`EmployeeService.GetByIdAsync`'s ~40-line mapping was extracted to a shared
`MapToDetailDto` rather than duplicated.

**Verified with a real Employee-role account:**

| Call | Result |
|---|---|
| all five `GetMy*` | **200** |
| `Employee/GetAll`, `EmployeeDossier/GetAll`, `LeaveRequest/GetAll` | **403** |

**Spoofing test.** An employee filed leave with a *different* employee's `employeeID`
in the payload. The value was ignored and the request was filed for the token holder:

```
POST /api/LeaveRequest/Create   body employeeID = cece44bb… (another employee)
→ 201, employeeName "Selftest Employee", filed-for id 5b27505e…
```

`LeaveRequestController.Create` overwrites `dto.EmployeeID` for non-admins. Follow this
pattern for any new "acting as myself" endpoint.

---

## 3. Document template engine — four defects fixed

The engine produces the documents people sign. All four defects were reproduced live
through `POST /api/DocumentTemplate/Preview` before and after.

| Test | Before | After |
|---|---|---|
| `$1,200` inside an `{{#assetList}}` block | `laptop - replacement cost laptop - replacement cost $1,200 USD` ⏎ `,200 USD` | `laptop - replacement cost $1,200 USD` |
| A second `{{#assetList}}` block | rendered using **block A's** template | renders using its own |
| Another employee's asset id | silently included in the document | **400**, "…is not assigned to this employee" |
| `{{employee.salary}}` (unknown placeholder) | printed **literally** into the document | stripped |
| `<script>alert(1)</script>` as a first name | injected raw into `dangerouslySetInnerHTML` | `&lt;script&gt;alert(1)&lt;/script&gt;` |

**Root causes and the rules that now hold:**

- **`$` corruption** — `assetListContent` was passed as the *replacement* argument to
  `Regex.Replace`, where `$1` means capture group 1. Substitution is now plain
  `string.Replace`, never the regex replacement path. Keep it that way.
- **Duplicate blocks** — `Regex.Match` found only the first block, then `Regex.Replace`
  substituted *every* block with that one's output. Now a `MatchEvaluator` expands each
  block with its own body.
- **Asset ownership** — `ProcessTemplateAsync` rejects any asset whose `EmployeeID`
  differs from the document's employee. `DocumentTemplateController.Preview` applies the
  same rule on its separate DTO path.
- **Escaping** — values go through `WebUtility.HtmlEncode`, because generated content is
  rendered via `dangerouslySetInnerHTML` on three pages
  (`DocumentGenerationModal.js:304`, `DocumentTemplateModal.js:316`,
  `GeneratedDocumentsPage.js:127`).
- **Leftover placeholders** — stripped rather than printed, so a missing dossier no
  longer leaves raw `{{employee.birthDate}}` in a signed document.

---

## 4. Leave requests — decisions are guarded and attributed

**Before:** `Approved` was a bare status string. No approver, no timestamp, no reason,
no state guard — `Approved → Rejected` and repeat approvals were both accepted — and no
overlap check.

**Change:**

- New fields `ApprovedByEmployeeID`, `DecisionAt`, `DecisionReason` on `LeaveRequest`,
  with the approver FK set to `Restrict` (deleting an approver must not delete the
  records they decided; `Employee` already cascades to `LeaveRequests`, and SQL Server
  rejects a second cascade path).
- Approve and Reject funnel through one private `DecideAsync`.
- `ILeaveRequestService` takes the approver as an **explicit parameter** — the
  parameterless overloads were removed so a decision cannot be recorded anonymously.
- New optional `LeaveDecisionRequestDto` body (`{ "reason": "…" }`).

**Rules now enforced:**

| Rule | Response |
|---|---|
| Only a `Pending` request can be decided | **409** "already approved and cannot be changed" |
| Nobody decides their own request | **409** |
| No overlap with an existing non-rejected request | **400** with the clashing dates |
| `LeaveType` must be Vacation/Sick/Parental/Unpaid | **400** |
| End date on/after start date | **400** |

Note: the old check was `EndDate <= StartDate`, which made **single-day leave
impossible** even though `TotalDays` counts inclusively. It is now `<`.

**A gap this surfaced.** The seeded admin had an Identity user but **no linked
`Employee` record**, so the first approval recorded `approvedBy: null` — the audit
trail was silently empty. Two changes:

- startup seeds an `Employee` for the dev admin (`System Administrator`);
- the API now **refuses** a decision it cannot attribute, rather than writing an
  anonymous one. An approval nobody can be held to is not an approval.

**Verified end to end:**

```
create (employee, spoofed id)      201  → filed for the token holder
overlapping request                400  "overlaps an existing pending request (2026-11-02 to 2026-11-06)"
employee approves own request      403  (not admin)
admin approves with reason         204
admin flips it to Rejected         409  "already approved and cannot be changed"

GetMyLeaveRequests →
  Parental 2027-03-01 → 2027-03-05 | Approved
    approvedBy: System Administrator | at 2026-09-16T23:47:00
    reason    : Approved under parental leave policy
```

**Backwards compatible:** `PUT …/approve` with **no body** still returns 204, so
existing clients keep working.

---

## Frontend changes

- `LeaveRequestsPage` sends an optional reason, surfaces the API's own message
  (including the 409 conflict) instead of a generic `alert`, and shows the decision
  trail — who decided, when, and why — on settled requests.
- `EmployeeDashboard` unwraps the dossier list. `GetMyDossier` returns a list of 0 or 1
  so it can back the generic `DataPage`; the dashboard card wants the single record.

Frontend compiles (`npx react-scripts build` → "Compiled with warnings"; all warnings
are pre-existing unused-vars). Note `CI=true` promotes those to errors, so a CI build
would fail until they're cleaned up.

---

## Schema change — read this before deploying

The new leave columns are applied by **`db/002_leave_request_decision_audit.sql`**, not
an EF migration.

`dotnet ef migrations add` is not usable here: there is no
`Microsoft.EntityFrameworkCore.Design` package, and the migrations recorded in
`__EFMigrationsHistory` are not committed to the repo and have no model snapshot — so a
new migration would try to recreate the entire schema.

The script is idempotent (verified by running it twice) and has been applied to the
local `HRApp` database. **Every other environment needs it run:**

```bash
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -I -i db/002_leave_request_decision_audit.sql
```

`-I` sets `QUOTED_IDENTIFIER ON`, which the `DELETE`/`ALTER` statements require.

Building a proper baseline migration remains the right long-term fix.

---

## Deliberately not done

These are features rather than fixes, and were left out of scope:

- **Leave entitlement / balance.** Nothing tracks how much leave anyone has; an employee
  can still book 300 days across non-overlapping requests.
- **Asset custody history.** Reassignment still overwrites the holder; there is no
  transfer record and no return date, only `IsActive`.
- **Cascade delete of document history.** Deleting an `Employee` still destroys their
  dossier, leave history, assets and **every generated document**. No soft delete.
- **Committed migrations** (see above) and **tests / CI** — there are no test projects
  and `.github/` is empty, so none of the above is protected against regression.

---

## Test data

All test data created during verification was removed: the `selftest.employee@example.com`
account, its Identity user and role rows, and its leave requests. The seeded admin's new
`Employee` record was intentionally kept — approvals depend on it.

## Related

- [`BUSINESS-FLOWS.md`](BUSINESS-FLOWS.md) — the original audit. Describes the
  **pre-fix** state; carries a status banner pointing here.
- `CLAUDE.md` — updated to the current behaviour.
- `.claude/agents/` — `authz-audit`, `api-contract-check`, `new-resource`, all updated
  to the hardened model.
