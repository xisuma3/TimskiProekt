-- 003_baseline_migrations.sql
--
-- Hands schema ownership over to EF migrations.
--
-- Until now this database was built out of band: __EFMigrationsHistory referenced two
-- migrations whose files were never committed, and there was no model snapshot, so
-- `dotnet ef migrations add` would have regenerated the entire schema. This script
-- reconciles the existing database with the new `InitialBaseline` migration and marks
-- that migration as already applied, so every later change can go through
-- `dotnet ef migrations add` / `dotnet ef database update` normally.
--
-- Run this ONCE, on each existing database. A brand-new database needs none of it —
-- `dotnet ef database update` builds everything from the migrations themselves.
--
-- Idempotent: safe to run more than once.
--
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -I -i db/003_baseline_migrations.sql

SET NOCOUNT ON;
GO

-- ---------------------------------------------------------------------------
-- 1. Drop the dead `Users` table.
--
-- Superseded by ASP.NET Identity (AspNetUsers) — `DbSet<User>` was removed from
-- HrAppDbContext and its OnModelCreating block commented out, so nothing reads or
-- writes it. Because it is absent from the model, EF migrations can never recreate
-- it, which would leave this database permanently unable to be rebuilt from source.
--
-- It also stores passwords in plain text, which is reason enough on its own.
-- ---------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
BEGIN
    PRINT 'Dropping dead dbo.Users table. Rows being removed:';
    SELECT Id, Email, EmployeeID, CreatedAt FROM dbo.Users;

    DECLARE @fk NVARCHAR(200);
    DECLARE fk_cursor CURSOR FOR
        SELECT name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.Users');
    OPEN fk_cursor;
    FETCH NEXT FROM fk_cursor INTO @fk;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC('ALTER TABLE dbo.Users DROP CONSTRAINT ' + @fk);
        FETCH NEXT FROM fk_cursor INTO @fk;
    END
    CLOSE fk_cursor;
    DEALLOCATE fk_cursor;

    DROP TABLE dbo.Users;
    PRINT 'Dropped dbo.Users';
END
ELSE
    PRINT 'dbo.Users already absent';
GO

-- ---------------------------------------------------------------------------
-- 2. Align LeaveRequests.EmployeeID with the model.
--
-- The model declares `Guid EmployeeID` (non-nullable) but the column was created
-- nullable. Verified zero NULL rows before tightening.
-- ---------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID(N'dbo.LeaveRequests')
             AND name = N'EmployeeID'
             AND is_nullable = 1)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.LeaveRequests WHERE EmployeeID IS NULL)
    BEGIN
        RAISERROR('LeaveRequests contains rows with a NULL EmployeeID; resolve these before running this script.', 16, 1);
    END
    ELSE
    BEGIN
        DECLARE @lrfk NVARCHAR(200) = (
            SELECT TOP 1 fk.name
            FROM sys.foreign_keys fk
            JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
            JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
            WHERE fk.parent_object_id = OBJECT_ID(N'dbo.LeaveRequests') AND c.name = N'EmployeeID');

        IF @lrfk IS NOT NULL EXEC('ALTER TABLE dbo.LeaveRequests DROP CONSTRAINT ' + @lrfk);

        ALTER TABLE dbo.LeaveRequests ALTER COLUMN EmployeeID UNIQUEIDENTIFIER NOT NULL;

        ALTER TABLE dbo.LeaveRequests
            ADD CONSTRAINT FK_LeaveRequests_Employees_EmployeeID
            FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees (EmployeeID)
            ON DELETE CASCADE;

        PRINT 'LeaveRequests.EmployeeID is now NOT NULL';
    END
END
ELSE
    PRINT 'LeaveRequests.EmployeeID already NOT NULL';
GO

-- ---------------------------------------------------------------------------
-- 3. Replace the orphaned migration history with the committed baseline.
--
-- The two existing rows name migrations that do not exist in the repository, so EF
-- cannot reason about them. InitialBaseline describes the schema this database
-- already has, so it is recorded as applied rather than executed.
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'__EFMigrationsHistory')
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId    NVARCHAR(150) NOT NULL,
        ProductVersion NVARCHAR(32)  NOT NULL,
        CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
    );
    PRINT 'Created __EFMigrationsHistory';
END
GO

DELETE FROM dbo.__EFMigrationsHistory
WHERE MigrationId IN (N'00000000000000_CreateIdentitySchema', N'20250604205705_InitialIdentitySchema');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260917000959_InitialBaseline')
BEGIN
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES (N'20260917000959_InitialBaseline', N'9.0.5');
    PRINT 'Stamped 20260917000959_InitialBaseline as applied';
END
ELSE
    PRINT '20260917000959_InitialBaseline already stamped';
GO

PRINT '';
PRINT 'Migration history is now:';
SELECT MigrationId, ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
GO
