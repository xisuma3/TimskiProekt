# Follow-up work — 2026-09-17

The four items [`FEATURES.md`](FEATURES.md) closed with as "still open". Verified
against the running app and the test suites, not by reading code.

---

## 1. GDPR erasure

**Before:** soft delete was the only delete path. A genuine right-to-erasure request had
no route — retiring an employee hid them but kept every piece of their personal data.

**Now:** `POST /api/Employee/Erase/{id}` (Admin). It resolves the tension between
Art. 17 and an employer's retention obligations by splitting the record in two:

| Destroyed | Kept |
|---|---|
| Name, email, position | Leave requests and their decisions |
| The login (`AspNetUsers` row) | Asset custody records |
| The dossier — birth date, address, emergency contact | The generated-document *rows* |
| The **body** of every generated document (it embeds the name and address verbatim) | |

The `Employee` row survives with `IsErased`/`ErasedAt` set and its identifying fields
overwritten, rather than being removed — the retained records point at it, and deleting
it would take them with it. What is kept describes *what the company did* and *what
happened to company property*, not who the person was.

**Two guards, both deliberate:**

- **Erasure requires the employee to be retired first.** Erasing someone still employed
  is almost certainly a mistake, and the two-step makes it an explicit decision.
- **An erased employee cannot be restored** — `Restore` returns 409.

The UI keeps them apart too. Retiring is an amber button with a plain confirm; erasing is
a red one that makes the admin type the employee's full name.

**Verified live:**

```
POST /api/Employee/Erase/{id}   (still active)  → 409 "Retire the employee before erasing"
DELETE /api/Employee/Delete/{id}                → 204
POST /api/Employee/Erase/{id}                   → 204

employee : Erased Employee | email=NULL | position=NULL | erased=1
dossier rows      : 0
login rows        : 0
leave requests    : 2        ← kept
POST /api/Auth/login as the erased user         → 401
```

---

## 2. Manager-scoped approval

**Before:** `ManagerID` was in the data model but carried no authority. Only `Admin`
could approve, so every request went to HR regardless of who the person reported to.

**Now:** authority comes from the org chart. `LeaveRequestService.DecideAsync` takes an
`approverIsAdmin` flag from the controller and enforces:

- an **admin** may decide any request;
- anyone else must be the requester's **manager**, else `UnauthorizedAccessException`
  → **403**;
- **nobody** may decide their own request, manager or not → **409**.

`GET /api/LeaveRequest/GetMyTeamRequests?pendingOnly=` gives a manager their reports'
requests. Retired reports are excluded.

The Approve/Reject routes dropped `[Authorize(Roles = "Admin")]` — the rule is now in the
service where it can be tested, rather than in an attribute that could only express
"admin or nothing".

**Verified live** with a manager account that is *not* an admin:

```
manager's team view (pendingOnly)      → Rep Test  2029-05-01  Pending
manager approves their own report      → 204
manager approves someone else's report → 403 "Only this employee's manager, or an
                                              administrator, can decide this request."
admin approves anything                → 204
non-manager's team view                → 0 reports
```

---

## 3. Frontend for the new features

Everything added in `FEATURES.md` was API-only. Now:

| Screen | What it does |
|---|---|
| **Leave Allowances** (`/leave-allowances`, Admin) | Create, edit and delete allowances per employee/year/type. Surfaces the API's 409s — "already has an allowance for this year", "cannot reduce below what is already committed". |
| **Balance cards** | On the employee dashboard and the leave page. Remaining / total with a progress bar, approved vs pending split, and an explicit **Uncapped** badge for untracked types. |
| **Asset custody modal** | Per asset: current holder, assign, transfer, return-with-condition, and the full chain as a table. Reached from a **Custody** button on each asset card. |
| **Team requests** | A non-admin with pending reports sees a banner and can review and decide them inline. |
| **Retire vs erase** | Two distinct buttons on the employee card with different colours, wording and confirmation weight. |

The asset card now reads its state from `isAssigned` rather than inferring it from
whether a holder name happens to be present, so an asset in stock shows an **In stock**
badge instead of a blank field.

`AssetController.Update` does not reassign, so the UI never moves an asset by editing
it — that always goes through the custody modal.

---

## 4. Schema rules in CI

**Before:** the unit suite uses the EF in-memory provider, which ignores foreign keys,
unique indexes and filters. Every schema rule would have passed there whatever the
database actually did.

**Now:** `HrApp.SchemaTests` — **14 tests** against a real SQL Server, on a throwaway
database built by **running the committed migrations** (`MigrateAsync`, not
`EnsureCreated`, so a migration that fails to reproduce the model is caught).

| Covers | |
|---|---|
| Cascade policy | `GeneratedDocuments`, `LeaveRequests`, `Assets`, `AssetAssignments` are all `NO_ACTION`; `EmployeeDossiers` still cascades |
| The constraint actually biting | Deleting an employee who has a document fails with `FK_GeneratedDocuments_Employees_EmployeeID`, and the document is still there afterwards |
| Both layers | With the dependents loaded, EF refuses client-side before SQL Server is asked |
| Filtered email index | Two active employees cannot share an address; a **retired** one does not reserve theirs |
| Filtered serial index | Many assets may have no serial number; two may not share one |
| Entitlement uniqueness | One allowance per employee/year/type |
| Migration fidelity | No pending model changes; the dead `Users` table is not recreated |

Connection string comes from `HRAPP_TEST_SQL`, falling back to LocalDB for developer
machines. CI supplies a `mcr.microsoft.com/mssql/server:2022-latest` service container.

### CI is now strict on the frontend

The nine files carrying `no-unused-vars` warnings have been cleaned up, and the frontend
job flipped from `CI: false` to `CI: true` — a new unused import or missing hook
dependency now fails the build rather than accumulating.

Two of those were worth more than tidying:

- `LeaveRequestModal` held `userInfo` state that was written and never read.
- `DataPage.fetchData` was recreated every render while the effect claimed to depend only
  on `[apiEndpoint, title]`. It is now wrapped in `useCallback` with honest dependencies,
  rather than suppressing the rule.

---

## Defects found along the way

Writing the schema tests surfaced a third instance of a pattern already fixed twice:

**A field optional in the request DTO but non-nullable in the model** fails at
`SaveChanges` with a `DbUpdateException` — an HTTP 500 where a saved record was expected.
`Asset.Description`/`SerialNumber` were the first two. Also affected, and now nullable:

- `DocumentTemplate.Description`
- `EmployeeDossier.Address`, `EmployeeDossier.EmergencyContact`

All four columns were already nullable in the database; only the model disagreed. Worth
checking the DTO and the model agree whenever either changes.

---

## Current state

| | |
|---|---|
| Unit tests | **65** passing (~2s, in-memory) |
| Schema tests | **14** passing (~2s, real SQL Server) |
| Migrations | 5, no pending model changes |
| CI jobs | backend, migrations drift gate, schema, frontend (strict) |

## Still open

- **Approval delegation.** A manager on leave cannot hand approval to someone else; the
  request simply waits.
- **Skip-level approval.** Only a direct manager can decide; there is no escalation to a
  manager's manager.
- **Notifications.** Nothing tells a manager a request is waiting — they have to open the
  page. The team banner is the closest thing.
- **Erasure audit log.** `IsErased`/`ErasedAt` record that it happened, but not who
  requested or performed it, which a regulator would expect.
- **Accrual.** Allowances are set per year by hand; leave does not accrue monthly, and
  carry-over is entered rather than calculated at year end.
