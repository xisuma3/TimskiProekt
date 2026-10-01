# Approvals, erasure audit and accrual — built 2026-10-02

The five items [`FOLLOW-UP.md`](FOLLOW-UP.md) closed with as "still open". Rules below are
covered by `HrApp.Tests/OpenFeaturesTests.cs` (20 tests) and were checked against the
running API with read-only or rejected-before-save calls.

One migration, `DelegationErasureAuditAccrual`: two new tables (`ApprovalDelegations`,
`ErasureRecords`), `LeaveRequests.DecidedOnBehalfOfEmployeeID`, and
`LeaveEntitlements.AccrualMethod` (default `Upfront`, so existing allowances behave exactly
as before). Every new foreign key is `Restrict` — these are audit records.

---

## 1. Skip-level approval

**Before:** only the requester's direct manager (or an admin) could decide.

**Now:** anyone *above* the requester in the reporting line can decide on their own
authority — manager, manager's manager, and so on. `LeaveRequestService.ResolveAuthorityAsync`
walks the chain over `EmployeeRepository.GetManagerMapAsync`: one query, retired managers
included so a gap in the org chart doesn't cut escalation off, and cycle-safe (corrupt data
where two people manage each other does not hang).

`GET /api/LeaveRequest/GetMyTeamRequests` now returns everything the caller can decide,
each with `approvalRoute`: **Direct report**, **Indirect report** or **Delegated by …**.

## 2. Approval delegation

**Before:** a manager on leave left their team's requests waiting.

**Now:** `ApprovalDelegation` — a manager hands their authority to a colleague for a date
range (`/api/ApprovalDelegation/GetMine|GetAll|Create|Revoke`, UI at **Approval Cover**).

| Rule | Result |
|---|---|
| A non-admin delegates only their own authority (delegator from the token) | admins may arrange cover for anyone |
| To yourself, end before start, ending in the past, retired delegate | 400 |
| Overlaps an existing non-revoked delegation from the same delegator | 409 |
| Delegations don't chain — a delegate uses only the delegator's own authority | 403 for the third person |
| Nobody decides their own request, even as a delegate | 409 |
| Revoke: delegator, delegate (declining) or admin | anyone else 403 |

A decision made under cover records `ApprovedByEmployeeID` (who acted) **and**
`DecidedOnBehalfOfEmployeeID` (whose authority); the leave card shows "… on behalf of …".
Revoking sets `RevokedAt`; rows are never deleted. Picking a colleague uses the new
`GET /api/Employee/GetDirectory` — id, name, position and department only, readable by any
signed-in user, so managers can arrange their own cover without seeing anyone's PII.

## 3. Notifications

The bell (client-derived, as chosen earlier) now also shows cover asked of you
("Mia Manager asked you to cover their approvals") and appends the route to team requests
that reach you by escalation or delegation. Still no email/push; read state stays per
browser.

## 4. Erasure audit log

**Before:** `IsErased`/`ErasedAt` said *that* an erasure happened, not who did it or why.

**Now:** `POST /api/Employee/Erase/{id}` requires `{ requestedBy, reason, requestReceivedAt? }`.
The performer is the caller from the token and must have an employee record; nobody erases
themselves. `EmployeeRepository.EraseAsync` writes the `ErasureRecord` in the **same
`SaveChanges`** as the erasure, so one cannot exist without the other. One record per
employee (unique index). `GET /api/Employee/GetErasureLog` (Admin) is append-only; it is
shown on **System Analysis → System health**. The erase dialog asks for the request details
and says a permanent record will name you.

## 5. Accrual and carry-over

**Monthly accrual.** An allowance is `Upfront` (all on 1 January) or `Monthly` (1/12 at the
start of each month). Carried-over days are always available in full. Balances are worked
out **as of** a date (`?asOf=`); a request is checked against what will have accrued by its
**last day in each year** — so in April you can book a week in October if October's accrual
covers it, but not five days next week with four accrued. The request form fetches
balances with the same `asOf`, so its warning matches the server.

**Carry-over** (`POST /api/LeaveEntitlement/CarryOver`, **Leave Allowances → Year-end
carry-over**): unused = full-year entitlement − approved − pending, capped at the policy
maximum, written to next year's `DaysCarriedOver`; a missing next-year allowance is
created with the same allocation and accrual. It *sets* rather than adds, so a re-run is
"Unchanged"; it skips an allowance where lowering carry-over would strand days already
booked next year. **Preview** saves nothing, and the UI only offers Apply after one.

---

## Current state

| | |
|---|---|
| Unit tests | **131** passing (in-memory) |
| Schema tests | **14** passing (real SQL Server, all migrations) |
| Frontend tests | **82** passing; CI build clean |
| Migrations | 7, no pending model changes |

## Still open

- **Timestamps without an offset.** Instants serialise as `2026-10-01T10:00:00` (no `Z`);
  the frontend corrects for it where it shows relative times (`parseInstant`). The proper
  fix is serialising with an offset on the backend.
- **Audit of ordinary edits.** Erasures are audited; edits to employees, templates and so
  on are not.
- **Notifications outside the app.** No email or push; managers still have to open the app.
- **Working-day leave counting.** Leave is charged by calendar day, weekends included.
