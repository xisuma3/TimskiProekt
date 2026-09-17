-- 002_leave_request_decision_audit.sql
--
-- Adds the decision audit trail to LeaveRequests: who decided, when, and why.
-- Before this, an approval was an unattributable status string.
--
-- This project has no committed EF migrations and the existing schema was created
-- out of band (__EFMigrationsHistory references migrations that are not in the repo),
-- so `dotnet ef migrations add` would try to recreate the whole schema. Schema changes
-- are therefore applied with scripts in this folder until a proper baseline migration
-- exists.
--
-- Idempotent: safe to run more than once.
--
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d HRApp -i db/002_leave_request_decision_audit.sql

SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.LeaveRequests')
                 AND name = N'ApprovedByEmployeeID')
BEGIN
    ALTER TABLE dbo.LeaveRequests ADD ApprovedByEmployeeID UNIQUEIDENTIFIER NULL;
    PRINT 'Added LeaveRequests.ApprovedByEmployeeID';
END
ELSE
    PRINT 'LeaveRequests.ApprovedByEmployeeID already present';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.LeaveRequests')
                 AND name = N'DecisionAt')
BEGIN
    ALTER TABLE dbo.LeaveRequests ADD DecisionAt DATETIME2 NULL;
    PRINT 'Added LeaveRequests.DecisionAt';
END
ELSE
    PRINT 'LeaveRequests.DecisionAt already present';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID(N'dbo.LeaveRequests')
                 AND name = N'DecisionReason')
BEGIN
    ALTER TABLE dbo.LeaveRequests ADD DecisionReason NVARCHAR(500) NULL;
    PRINT 'Added LeaveRequests.DecisionReason';
END
ELSE
    PRINT 'LeaveRequests.DecisionReason already present';
GO

-- NO ACTION (not CASCADE): deleting an approver must not delete the leave records they
-- decided. Employees already cascade to LeaveRequests via EmployeeID, and SQL Server
-- rejects a second cascade path on the same table.
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys
               WHERE name = N'FK_LeaveRequests_Employees_ApprovedByEmployeeID')
BEGIN
    ALTER TABLE dbo.LeaveRequests
        ADD CONSTRAINT FK_LeaveRequests_Employees_ApprovedByEmployeeID
        FOREIGN KEY (ApprovedByEmployeeID) REFERENCES dbo.Employees (EmployeeID)
        ON DELETE NO ACTION;
    PRINT 'Added FK_LeaveRequests_Employees_ApprovedByEmployeeID';
END
ELSE
    PRINT 'FK_LeaveRequests_Employees_ApprovedByEmployeeID already present';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = N'IX_LeaveRequests_ApprovedByEmployeeID'
                 AND object_id = OBJECT_ID(N'dbo.LeaveRequests'))
BEGIN
    CREATE INDEX IX_LeaveRequests_ApprovedByEmployeeID
        ON dbo.LeaveRequests (ApprovedByEmployeeID);
    PRINT 'Added IX_LeaveRequests_ApprovedByEmployeeID';
END
ELSE
    PRINT 'IX_LeaveRequests_ApprovedByEmployeeID already present';
GO
