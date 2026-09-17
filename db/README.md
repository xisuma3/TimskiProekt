# Database setup

Schema is owned by **EF Core migrations** (`hr-app-backend/HrApp.Repository/Migrations/`).
The SQL scripts in this folder exist only to bring a database that predates migrations
up to the point where EF can take over.

## A new database

Nothing in this folder is needed. The migrations build the whole schema:

```bash
cd hr-app-backend
dotnet ef database update --project HrApp.Repository --startup-project HrAppWebApplication
```

## An existing database (created before 2026-09-17)

Run these **once, in order**, then hand over to EF:

```bash
# 1. Decision audit columns on LeaveRequests (approver, timestamp, reason)
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -I -i db/002_leave_request_decision_audit.sql

# 2. Reconcile with the committed baseline and stamp it as applied
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -I -i db/003_baseline_migrations.sql

# 3. From here on, EF owns the schema
cd hr-app-backend
dotnet ef database update --project HrApp.Repository --startup-project HrAppWebApplication
```

`-I` sets `QUOTED_IDENTIFIER ON`, which several statements require. Both scripts are
idempotent — re-running them reports what is already present and changes nothing.

### What `003` does, and why it was needed

This database was originally created by hand. `__EFMigrationsHistory` named two
migrations whose files were never committed, and there was no model snapshot, so
`dotnet ef migrations add` would have generated a migration recreating the entire
schema. The script:

1. **Drops the dead `Users` table.** Superseded by ASP.NET Identity, absent from the
   model (so migrations could never recreate it, leaving the database permanently
   unreproducible), and it stored passwords in plain text.
2. **Makes `LeaveRequests.EmployeeID` NOT NULL**, matching the model. Verified zero NULL
   rows first.
3. **Replaces the orphaned history rows** with `20260917000959_InitialBaseline`, recorded
   as applied rather than executed, because the schema already existed.

### Legacy constraint names

Because the original tables were hand-written, their constraints carry SQL Server's
auto-generated names (`FK__Assets__Employee__3D5E1FD2`, `UQ__Employee__A9D1...`) instead
of EF's conventions — and `Assets` even had two foreign keys on the same column. The two
migrations that follow the baseline therefore open with a `migrationBuilder.Sql` block
that drops whatever constraint is actually present **by column**, rather than by EF's
expected name. After those run, everything is EF-canonical and later migrations need no
special handling.

## Adding a schema change from here on

Use EF, not a script in this folder:

```bash
cd hr-app-backend
dotnet ef migrations add <Name> --project HrApp.Repository --startup-project HrAppWebApplication
dotnet ef database update --project HrApp.Repository --startup-project HrAppWebApplication
```

CI runs `dotnet ef migrations has-pending-model-changes`, so a model change committed
without its migration fails the build.
