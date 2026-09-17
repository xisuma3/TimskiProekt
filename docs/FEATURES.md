# Deferred features — built 2026-09-17

The five items [`FIXES.md`](FIXES.md) closed with as "deliberately not done". Every
claim here was verified against the running app or the test suite, not by reading code.

Order matters: migrations came first so the three schema features could ride on them,
and tests came last so they cover everything.

---

## 1. EF migrations own the schema

**Before:** no migrations were committed and `Program.cs` never called `Migrate()`. The
schema had been built by hand, `__EFMigrationsHistory` named two migrations whose files
were absent from the repo, and there was no model snapshot — so `dotnet ef migrations add`
would have generated a migration recreating everything. Schema changes had to be
hand-written SQL.

**Now:** `Microsoft.EntityFrameworkCore.Design` is referenced and
`HrApp.Repository/Migrations/` holds three migrations. A new database is built entirely
by `dotnet ef database update`. `db/README.md` covers the one-time scripts an older
database needs first.

### The drift this exposed

Stamping a baseline forces a comparison between model and database, and they disagreed
in several places:

| Drift | Resolution |
|---|---|
| Dead `Users` table in the DB, absent from the model — and storing **plaintext passwords** | Dropped in `db/003`. Absent from the model means migrations could never recreate it, leaving the DB permanently unreproducible. |
| `LeaveRequests.EmployeeID` nullable in the DB, `Guid` in the model | Tightened to `NOT NULL` (verified zero NULL rows first). |
| `GeneratedDocuments` FK was `NO_ACTION` in the DB while the model said `Cascade` | Both are now `Restrict`, deliberately. |
| `Asset.Description`/`SerialNumber` non-nullable in the model, nullable in the DB | Model made nullable — see §4. |

### Legacy constraint names

The hand-written tables carry SQL Server's auto-generated constraint names
(`FK__Assets__Employee__3D5E1FD2`, `UQ__Employee__A9D1...`) rather than EF's conventions,
and `Assets` had **two** foreign keys on the same column. Dropping by EF's expected name
fails there.

The two migrations after `InitialBaseline` therefore open with a `migrationBuilder.Sql`
block that drops whatever constraint is present **by column**, not by name. They work on
both a legacy database and one built fresh from the baseline. Everything after them is
EF-canonical.

---

## 2. Employee soft delete, and history that outlives employment

**Before:** deleting an `Employee` cascaded to their dossier, every leave request, every
asset record **and every generated document**. There was no soft delete.

**Now:** `Employee.IsDeleted` / `DeletedAt`. `EmployeeRepository` filters retired
employees out of `GetAllAsync`, `GetByIdAsync` and `GetByApplicationUserIdAsync`, with
`GetByIdIncludingDeletedAsync` for history and `RestoreAsync` to bring someone back.

Filtering is done explicitly in the repository rather than with an EF global query
filter. Repositories already own every query concern in this codebase, and a global
filter on `Employee` would have hidden a retired employee's *documents* too — the exact
opposite of the point.

**Cascade policy, set deliberately per relationship:**

| Relationship | Behaviour | Why |
|---|---|---|
| `GeneratedDocument` → `Employee` | **Restrict** | A signed document is a record of fact. |
| `LeaveRequest` → `Employee` | **Restrict** | So is an approval decision. |
| `Asset` → `Employee` | **Restrict** | Company property; custody is tracked separately. |
| `AssetAssignment` → `Employee` | **Restrict** | The record that they once held equipment. |
| `EmployeeDossier` → `Employee` | **Cascade** | Current-state PII that should go on erasure. |

So even a hard delete can no longer take the history with it.

The unique index on `Employee.Email` is now **filtered** (`WHERE IsDeleted = 0`) — a
retired employee would otherwise reserve their address against a re-hire forever.

**Verified live:**

```
before   employees listed: 8 | leave requests: 3 | custody records: 2
DELETE /api/Employee/Delete/{id}        → 204
after    employees listed: 7 | leave requests: 3 | custody records: 2
         row still present, IsDeleted=1
POST /api/Employee/Restore/{id}         → 204
         employees listed: 8
```

---

## 3. Asset custody history

**Before:** `Asset.EmployeeID` was the only record of who held an asset. Reassignment
overwrote it and the previous holder was gone. `IsActive` was the entire lifecycle, and
there was no return date.

**Now:** `AssetAssignment` is the custody chain — one row per period an employee held an
asset. The row with `ReturnedDate == null` is the current holder; closed rows are
history. `Asset.EmployeeID` is nullable, because an asset in stock is held by nobody.

| Operation | Route | Behaviour |
|---|---|---|
| Hand over | `POST /api/Asset/Assign/{id}` | Closes any open period **at the handover date**, opens a new one |
| Take back | `POST /api/Asset/Return/{id}` | Closes the open period, returns the asset to stock, records condition |
| Chain | `GET /api/Asset/GetHistory/{id}` | Every holder, newest first |
| Mine | `GET /api/Asset/GetMyAssetHistory` | Everything the caller has held, including returned |

`AssetController.Update` deliberately does **not** reassign — moving an asset goes
through `AssignAsync` so custody is always recorded.

**Guards:** re-assigning to the current holder → 409; returning something already in
stock → 409; back-dating a handover or return before the open period began → 400.

**Verified live** — the transfer that used to lose the previous holder:

```
GET /api/Asset/GetHistory/{laptop}
  markOO tasevski   2025-06-19 -> still held   (backfilled)

POST /api/Asset/Assign/{laptop}  → Bob Smith
  Bob Smith         2026-09-17 -> still held   Reassigned after team move
  markOO tasevski   2025-06-19 -> 2026-09-17   (backfilled)
```

**Backfill.** The migration seeds an open assignment for every asset that already had a
holder — otherwise each would have looked as though it had never been handed to anyone,
and `Return` would have reported "already in stock". 5 rows were created on the existing
database.

---

## 4. Leave entitlement and balance

**Before:** nothing tracked how much leave anyone had. An employee could book 300 days.

**Now:** `LeaveEntitlement` is one allowance per (employee, year, leave type), with
`DaysAllocated` plus optional `DaysCarriedOver`.

**Balance is derived, never stored.** A running counter drifts the moment a request is
edited, deleted or back-dated, and then there is no way to tell which number is right.
Remaining = allocated + carried over − (approved + pending).

Three decisions worth knowing:

- **Pending days count against the balance.** Otherwise an employee with 2 days left
  could file three more requests and have every one of them approvable.
- **A missing entitlement row means uncapped, not zero.** Sick leave is normally governed
  by policy and certificates rather than a day count, so `LeaveRequestService` skips the
  check when the type is untracked.
- **A request spanning New Year is charged to both years** and must fit in each.

| Route | Purpose |
|---|---|
| `GET /api/LeaveEntitlement/GetMyBalance?year=` | The caller's own standing, from the token |
| `GET /api/LeaveEntitlement/GetBalance/{employeeId}?year=` | Admin view |
| `POST/PUT/DELETE /api/LeaveEntitlement/…` | Manage allowances (Admin) |

Reducing an allowance below what is already committed returns **409** rather than
producing a negative balance nobody can act on.

**Verified live:**

```
grant 10 vacation days for 2027
request 1-5 Jun  (5 days)                    → 201
request 1-8 Aug  (8 days)                    → 400
   "Not enough vacation leave: requesting 8 day(s) but only 5.00 of 10.00
    remain (0 approved, 5 pending)."

grant 1 vacation day for 2028
request 30 Dec 2027 - 2 Jan 2028             → 400
   "Not enough vacation leave in 2028: requesting 2 day(s) but only 1.00 ... remain"
request 30 Dec 2027 - 1 Jan 2028             → 201
   2027 pending = 2, 2028 pending = 1
```

---

## 5. Tests and CI

**Before:** no test projects, and `.github/` was empty.

**Now:** `HrApp.Tests` — **53 tests, all passing**, running in about 2 seconds.

They are built around `TestHarness`, which wires a real `DbContext` (EF in-memory), real
repositories and real services together, so tests exercise the actual query and mapping
code rather than mocks. Each harness gets its own database name, so they run in
parallel.

| Area | Cover |
|---|---|
| `TemplateProcessingServiceTests` | Regression for all four template defects — including a `[Theory]` over `$&`, `$1`, `$$`, `` $` `` |
| `LeaveRequestServiceTests` | Dates, single-day leave, types, overlap, decision guards, entitlement, the New Year split |
| `AssetCustodyTests` | Assign, transfer, return, back-dating, duplicate serials, employee history |
| `SoftDeleteTests` | Retire, restore, history preservation, idempotent retire |
| `LeaveBalanceTests` | `DaysWithinYear` apportionment (incl. a leap year), carry-over, approved vs pending |

**Known limitation, stated plainly:** the in-memory provider does not enforce foreign
keys, unique indexes or column types. These tests cover *service behaviour*. Rules that
live only in the schema — the filtered indexes, the `Restrict` cascades — were verified
against SQL Server instead, and are not protected by CI.

### CI — `.github/workflows/ci.yml`

| Job | Does |
|---|---|
| `backend` | Restore, Release build, `dotnet test`, uploads a `.trx` |
| `migrations` | `dotnet ef migrations has-pending-model-changes` — fails when a model change is committed without its migration |
| `frontend` | `npm ci` + `npm run build` |

All three were run locally before committing; the drift gate reports *"No changes have
been made to the model since the last migration."*

The frontend job originally set `CI: false`, because the app carried pre-existing
`no-unused-vars` warnings across nine files and `CI=true` promotes every warning to an
error. Those have since been cleaned up and the flag flipped — see
[`FOLLOW-UP.md`](FOLLOW-UP.md).

---

## Test data

All test data created during verification was removed: the 2027/2028 leave requests and
entitlements, the transferred asset was returned to stock, and the retired employee was
restored. The dev admin's seeded `Employee` record remains, as approvals depend on it.

## Still open

*(All four of these were subsequently built — see [`FOLLOW-UP.md`](FOLLOW-UP.md).)*

- **Hard delete / GDPR erasure.**
- **Manager-scoped approval.**
- **Frontend for the new features.**
- **Schema rules in CI.**
