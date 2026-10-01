-- Dummy data for local development. Idempotent: every insert is guarded by a natural key
-- (department name, employee email, asset serial, ...), so re-running adds nothing twice.
-- Employees get no login (ApplicationUserId stays NULL) - they are org-chart/HR data only.
--
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -d HRApp -E -i db\seed-dummy-data.sql
SET QUOTED_IDENTIFIER ON; -- required by the filtered unique indexes; sqlcmd defaults it off
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- Departments ---------------------------------------------------------------------------
INSERT INTO Departments (DepartmentID, Name, Description)
SELECT NEWID(), v.Name, v.Description
FROM (VALUES
  ('Finance', 'Accounting, payroll and budgeting'),
  ('Sales',   'Customer acquisition and account management'),
  ('Legal',   'Contracts, compliance and data protection')
) v(Name, Description)
WHERE NOT EXISTS (SELECT 1 FROM Departments d WHERE d.Name = v.Name);

-- Employees -----------------------------------------------------------------------------
-- Manager/Mentor are emails, resolved after insert so order does not matter.
DECLARE @emp TABLE (First nvarchar(100), Last nvarchar(100), Email nvarchar(255), Dept nvarchar(100),
                    Pos nvarchar(100), Hired date, ManagerEmail nvarchar(255), MentorEmail nvarchar(255));
INSERT INTO @emp VALUES
 ('Maria',   'Petrova',    'maria.petrova@example.com',    'Finance',         'Finance Manager',     '2019-03-11', NULL,                          NULL),
 ('Stefan',  'Ilievski',   'stefan.ilievski@example.com',  'Finance',         'Accountant',          '2022-06-01', 'maria.petrova@example.com',   NULL),
 ('Ana',     'Trajkovska', 'ana.trajkovska@example.com',   'Finance',         'Payroll Specialist',  '2024-01-15', 'maria.petrova@example.com',   'stefan.ilievski@example.com'),
 ('Nikola',  'Dimitrov',   'nikola.dimitrov@example.com',  'Sales',           'Sales Director',      '2018-09-03', NULL,                          NULL),
 ('Elena',   'Kostova',    'elena.kostova@example.com',    'Sales',           'Account Executive',   '2021-02-22', 'nikola.dimitrov@example.com', NULL),
 ('Petar',   'Stojanov',   'petar.stojanov@example.com',   'Sales',           'Sales Representative','2023-10-09', 'nikola.dimitrov@example.com', 'elena.kostova@example.com'),
 ('Ivana',   'Nikolova',   'ivana.nikolova@example.com',   'Legal',           'Legal Counsel',       '2020-05-18', NULL,                          NULL),
 ('Aleksandar','Mitev',    'aleksandar.mitev@example.com', 'IT',              'Software Engineer',   '2021-11-02', 'bob.smith@example.com',       NULL),
 ('Jovana',  'Ristova',    'jovana.ristova@example.com',   'IT',              'QA Engineer',         '2023-04-17', 'bob.smith@example.com',       'aleksandar.mitev@example.com'),
 ('Darko',   'Angelov',    'darko.angelov@example.com',    'IT',              'DevOps Engineer',     '2022-08-29', 'bob.smith@example.com',       NULL),
 ('Katerina','Georgieva',  'katerina.georgieva@example.com','Marketing',      'Content Strategist',  '2022-01-10', 'carol.davis@example.com',     NULL),
 ('Martin',  'Spasov',     'martin.spasov@example.com',    'Marketing',       'Graphic Designer',    '2024-09-02', 'carol.davis@example.com',     'katerina.georgieva@example.com'),
 ('Sara',    'Atanasova',  'sara.atanasova@example.com',   'Human Resources', 'Recruiter',           '2023-07-24', 'alice.johnson@example.com',   'david.wilson@example.com'),
 ('Filip',   'Bogdanov',   'filip.bogdanov@example.com',   'Operations',      'Operations Analyst',  '2020-12-07', NULL,                          NULL);

INSERT INTO Employees (EmployeeID, FirstName, LastName, Email, HireDate, Position, DepartmentID, IsDeleted, IsErased)
SELECT NEWID(), e.First, e.Last, e.Email, e.Hired, e.Pos, d.DepartmentID, 0, 0
FROM @emp e
JOIN Departments d ON d.Name = e.Dept
WHERE NOT EXISTS (SELECT 1 FROM Employees x WHERE x.Email = e.Email AND x.IsDeleted = 0);

UPDATE x SET ManagerID = m.EmployeeID
FROM Employees x JOIN @emp e ON e.Email = x.Email
JOIN Employees m ON m.Email = e.ManagerEmail AND m.IsDeleted = 0
WHERE x.ManagerID IS NULL;

UPDATE x SET MentorID = m.EmployeeID
FROM Employees x JOIN @emp e ON e.Email = x.Email
JOIN Employees m ON m.Email = e.MentorEmail AND m.IsDeleted = 0
WHERE x.MentorID IS NULL;

-- Department heads for the pre-existing managers' teams
UPDATE x SET ManagerID = m.EmployeeID
FROM Employees x JOIN Employees m ON m.Email = 'alice.johnson@example.com'
WHERE x.Email = 'david.wilson@example.com' AND x.ManagerID IS NULL;
UPDATE x SET ManagerID = m.EmployeeID
FROM Employees x JOIN Employees m ON m.Email = 'bob.smith@example.com'
WHERE x.Email = 'eva.brown@example.com' AND x.ManagerID IS NULL;

-- Dossiers (one per employee, only where missing) -----------------------------------------
INSERT INTO EmployeeDossiers (DossierID, EmployeeID, BirthDate, Address, EmergencyContact, EmploymentType)
SELECT NEWID(), e.EmployeeID,
       DATEADD(DAY, ABS(CHECKSUM(e.Email)) % 5000, '1982-01-01'),
       CONCAT(N'ul. Partizanska ', 1 + ABS(CHECKSUM(e.Email, 'a')) % 120, N', Skopje'),
       CONCAT(N'+389 70 ', RIGHT(CONCAT('000000', ABS(CHECKSUM(e.Email, 'p')) % 1000000), 6)),
       CASE WHEN e.Email IN ('martin.spasov@example.com','sara.atanasova@example.com') THEN 'Part-Time'
            WHEN e.Email IN ('darko.angelov@example.com') THEN 'Contract' ELSE 'Full-Time' END
FROM Employees e
WHERE e.IsDeleted = 0 AND e.Email LIKE '%@example.com' AND e.Email <> 'admin@example.com'
  AND NOT EXISTS (SELECT 1 FROM EmployeeDossiers d WHERE d.EmployeeID = e.EmployeeID);

-- Leave entitlements for 2026 (Vacation capped, Sick uncapped = no row) -------------------
INSERT INTO LeaveEntitlements (EntitlementID, EmployeeID, Year, LeaveType, DaysAllocated, DaysCarriedOver)
SELECT NEWID(), e.EmployeeID, 2026, 'Vacation', 20, ABS(CHECKSUM(e.Email)) % 6
FROM Employees e
WHERE e.IsDeleted = 0 AND e.Email LIKE '%@example.com' AND e.Email <> 'admin@example.com'
  AND NOT EXISTS (SELECT 1 FROM LeaveEntitlements l WHERE l.EmployeeID = e.EmployeeID AND l.Year = 2026 AND l.LeaveType = 'Vacation');

-- Leave requests ------------------------------------------------------------------------
-- Approved/Rejected ones are decided by the requester's manager (or Alice when they have none),
-- never by the requester, matching LeaveRequestService's rules. Overlaps are avoided per employee.
DECLARE @lv TABLE (Email nvarchar(255), Start date, Finish date, Type nvarchar(50), Status nvarchar(20), Reason nvarchar(200));
INSERT INTO @lv VALUES
 ('stefan.ilievski@example.com',  '2026-07-20', '2026-07-31', 'Vacation', 'Approved', 'Summer holiday'),
 ('ana.trajkovska@example.com',   '2026-03-02', '2026-03-04', 'Sick',     'Approved', NULL),
 ('ana.trajkovska@example.com',   '2026-11-23', '2026-11-27', 'Vacation', 'Pending',  NULL),
 ('elena.kostova@example.com',    '2026-08-03', '2026-08-14', 'Vacation', 'Approved', NULL),
 ('petar.stojanov@example.com',   '2026-10-12', '2026-10-16', 'Vacation', 'Pending',  NULL),
 ('petar.stojanov@example.com',   '2026-05-04', '2026-05-08', 'Vacation', 'Rejected', 'Quarter-end push, please move'),
 ('aleksandar.mitev@example.com', '2026-06-15', '2026-06-26', 'Vacation', 'Approved', NULL),
 ('aleksandar.mitev@example.com', '2026-12-21', '2026-12-31', 'Vacation', 'Pending',  NULL),
 ('jovana.ristova@example.com',   '2026-04-13', '2026-04-14', 'Sick',     'Approved', NULL),
 ('jovana.ristova@example.com',   '2026-09-07', '2026-09-18', 'Unpaid',   'Pending',  NULL),
 ('darko.angelov@example.com',    '2026-02-09', '2026-02-13', 'Vacation', 'Approved', NULL),
 ('katerina.georgieva@example.com','2026-10-05','2026-10-09', 'Vacation', 'Approved', NULL),
 ('martin.spasov@example.com',    '2026-10-26', '2026-10-30', 'Vacation', 'Pending',  NULL),
 ('sara.atanasova@example.com',   '2026-01-05', '2026-01-23', 'Parental', 'Approved', 'Parental leave'),
 ('eva.brown@example.com',        '2026-08-17', '2026-08-21', 'Vacation', 'Approved', NULL),
 ('david.wilson@example.com',     '2026-12-14', '2026-12-18', 'Vacation', 'Pending',  NULL);

INSERT INTO LeaveRequests (RequestID, EmployeeID, StartDate, EndDate, LeaveType, Status, CreatedAt,
                           ApprovedByEmployeeID, DecisionAt, DecisionReason)
SELECT NEWID(), e.EmployeeID, l.Start, l.Finish, l.Type, l.Status,
       DATEADD(DAY, -10, CAST(l.Start AS datetime2)),
       CASE WHEN l.Status = 'Pending' THEN NULL ELSE COALESCE(e.ManagerID, a.EmployeeID) END,
       CASE WHEN l.Status = 'Pending' THEN NULL ELSE DATEADD(DAY, -8, CAST(l.Start AS datetime2)) END,
       CASE WHEN l.Status = 'Pending' THEN NULL ELSE l.Reason END
FROM @lv l
JOIN Employees e ON e.Email = l.Email AND e.IsDeleted = 0
JOIN Employees a ON a.Email = 'alice.johnson@example.com'
WHERE NOT EXISTS (SELECT 1 FROM LeaveRequests r WHERE r.EmployeeID = e.EmployeeID AND r.StartDate = l.Start);

-- Assets + custody chain ----------------------------------------------------------------
-- Holder = who has it now (NULL = in stock). PrevHolder = earlier closed period, if any.
DECLARE @as TABLE (Name nvarchar(100), Descr nvarchar(max), Serial nvarchar(100), Holder nvarchar(255),
                   Since date, PrevHolder nvarchar(255), PrevFrom date);
INSERT INTO @as VALUES
 ('Laptop',        'Dell Latitude 7440',        'DUMMY-LT-001', 'aleksandar.mitev@example.com', '2025-01-10', NULL, NULL),
 ('Laptop',        'MacBook Pro 14"',           'DUMMY-LT-002', 'martin.spasov@example.com',    '2024-09-02', NULL, NULL),
 ('Laptop',        'Lenovo ThinkPad T14',       'DUMMY-LT-003', 'jovana.ristova@example.com',   '2025-06-01', 'darko.angelov@example.com', '2023-02-01'),
 ('Laptop',        'HP EliteBook 840',          'DUMMY-LT-004', NULL,                           NULL,         'stefan.ilievski@example.com', '2022-06-01'),
 ('Monitor',       'Dell U2723QE 27" 4K',       'DUMMY-MN-001', 'darko.angelov@example.com',    '2022-09-05', NULL, NULL),
 ('Monitor',       'LG 24" Full HD',            'DUMMY-MN-002', NULL,                           NULL,         NULL, NULL),
 ('Mobile Phone',  'iPhone 14',                 'DUMMY-PH-001', 'nikola.dimitrov@example.com',  '2023-03-15', NULL, NULL),
 ('Mobile Phone',  'Samsung Galaxy S23',        'DUMMY-PH-002', 'elena.kostova@example.com',    '2023-05-02', NULL, NULL),
 ('Headset',       'Jabra Evolve2 65',          'DUMMY-HS-001', 'sara.atanasova@example.com',   '2023-07-24', NULL, NULL),
 ('Office Chair',  'Ergonomic mesh chair',      'DUMMY-CH-001', 'maria.petrova@example.com',    '2021-01-04', NULL, NULL),
 ('Access Card',   'Building access, floor 3',  'DUMMY-AC-001', 'ana.trajkovska@example.com',   '2024-01-15', NULL, NULL),
 ('Docking Station','Dell WD22TB4',             'DUMMY-DK-001', 'aleksandar.mitev@example.com', '2025-01-10', NULL, NULL);

INSERT INTO Assets (AssetID, EmployeeID, Name, Description, SerialNumber, AssignmentDate, IsActive)
SELECT NEWID(), h.EmployeeID, a.Name, a.Descr, a.Serial, a.Since, 1
FROM @as a
LEFT JOIN Employees h ON h.Email = a.Holder AND h.IsDeleted = 0
WHERE NOT EXISTS (SELECT 1 FROM Assets x WHERE x.SerialNumber = a.Serial);

-- Closed (previous holder) periods
INSERT INTO AssetAssignments (AssignmentID, AssetID, EmployeeID, AssignedDate, ReturnedDate, Notes, ReturnCondition)
SELECT NEWID(), s.AssetID, p.EmployeeID, a.PrevFrom,
       COALESCE(a.Since, '2025-03-31'), 'Initial issue', 'Good'
FROM @as a
JOIN Assets s ON s.SerialNumber = a.Serial
JOIN Employees p ON p.Email = a.PrevHolder AND p.IsDeleted = 0
WHERE a.PrevHolder IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM AssetAssignments x WHERE x.AssetID = s.AssetID AND x.EmployeeID = p.EmployeeID);

-- Open (current holder) periods
INSERT INTO AssetAssignments (AssignmentID, AssetID, EmployeeID, AssignedDate, ReturnedDate, Notes)
SELECT NEWID(), s.AssetID, s.EmployeeID, s.AssignmentDate, NULL,
       CASE WHEN a.PrevHolder IS NOT NULL THEN 'Reassigned after return' ELSE 'New starter kit' END
FROM @as a
JOIN Assets s ON s.SerialNumber = a.Serial
WHERE s.EmployeeID IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM AssetAssignments x WHERE x.AssetID = s.AssetID AND x.ReturnedDate IS NULL);

COMMIT;

SELECT 'Departments' AS [Table], COUNT(*) AS [Rows] FROM Departments
UNION ALL SELECT 'Employees', COUNT(*) FROM Employees
UNION ALL SELECT 'EmployeeDossiers', COUNT(*) FROM EmployeeDossiers
UNION ALL SELECT 'LeaveEntitlements', COUNT(*) FROM LeaveEntitlements
UNION ALL SELECT 'LeaveRequests', COUNT(*) FROM LeaveRequests
UNION ALL SELECT 'Assets', COUNT(*) FROM Assets
UNION ALL SELECT 'AssetAssignments', COUNT(*) FROM AssetAssignments;
