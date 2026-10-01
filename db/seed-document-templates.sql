-- Document templates for local development. Idempotent: keyed on TemplateName.
-- NOTE: never put {{#assetList}} markers inside <table>; the sanitizer's HTML parser hoists them out.
-- Placeholders are limited to what TemplateProcessingService resolves:
--   employee.{firstName,lastName,email,position,department,hireDate,birthDate,address,
--             emergencyContact,employmentType}, system.{currentDate,currentDateTime},
--   and inside {{#assetList}}...{{/assetList}}: asset.{name,serialNumber,description,assignmentDate,isActive}.
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -d HRApp -E -i db\seed-document-templates.sql
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

DECLARE @t TABLE (Name nvarchar(100), Descr nvarchar(max), Type nvarchar(50), Content nvarchar(max));

INSERT INTO @t VALUES
(N'Employment Contract (Standard)', N'Full-time or part-time employment agreement', N'Employment',
N'<h1>Employment Agreement</h1>
<p>Date: {{system.currentDate}}</p>
<p>This agreement is made between the Company and <strong>{{employee.firstName}} {{employee.lastName}}</strong> ({{employee.email}}), residing at {{employee.address}}.</p>
<h3>1. Position</h3>
<p>The Employee is engaged as <strong>{{employee.position}}</strong> in the {{employee.department}} department, on a {{employee.employmentType}} basis, starting {{employee.hireDate}}.</p>
<h3>2. Probation</h3>
<p>The first three (3) months of employment are a probationary period.</p>
<h3>3. Working time and leave</h3>
<p>Working time, annual leave and other leave are governed by the Company leave policy and applicable law.</p>
<h3>4. Confidentiality</h3>
<p>The Employee shall keep confidential all non-public information of the Company during and after employment.</p>
<p>Emergency contact on file: {{employee.emergencyContact}}</p>
<br/>
<p>Employee signature: ______________________ &nbsp;&nbsp; Date: {{system.currentDate}}</p>
<p>Company representative: ______________________</p>'),

(N'Asset Handover Form', N'Lists equipment handed to an employee', N'Asset',
N'<h1>Equipment Handover</h1>
<p>Date: {{system.currentDate}}</p>
<p>Employee: <strong>{{employee.firstName}} {{employee.lastName}}</strong> &mdash; {{employee.position}}, {{employee.department}}</p>
<p>The employee confirms receipt of the following company equipment in working condition:</p>
{{#assetList}}<div style="border:1px solid #999;padding:8px;margin-bottom:6px"><strong>{{asset.name}}</strong> &mdash; S/N {{asset.serialNumber}}<br/>{{asset.description}} (assigned {{asset.assignmentDate}})</div>
{{/assetList}}
<p>The employee agrees to use the equipment for work purposes, to report loss or damage immediately, and to return it on request or on leaving the Company.</p>
<br/>
<p>Employee signature: ______________________</p>
<p>IT / HR signature: ______________________</p>'),

(N'Equipment Return Form', N'Records equipment returned on exit or swap', N'Asset',
N'<h1>Equipment Return</h1>
<p>Date: {{system.currentDate}}</p>
<p>Employee: {{employee.firstName}} {{employee.lastName}} ({{employee.department}})</p>
<p>The following items were returned to the Company:</p>
<ul>
{{#assetList}}<li>{{asset.name}} &mdash; S/N {{asset.serialNumber}}</li>
{{/assetList}}</ul>
<p>Condition on return: ______________________</p>
<p>Received by: ______________________</p>'),

(N'Salary Adjustment Letter', N'Notifies an employee of a salary change', N'Salary',
N'<h1>Salary Adjustment</h1>
<p>Date: {{system.currentDate}}</p>
<p>Dear {{employee.firstName}} {{employee.lastName}},</p>
<p>Following your performance review as <strong>{{employee.position}}</strong> in {{employee.department}}, we are pleased to confirm an adjustment to your salary, effective from the next payroll period.</p>
<p>New gross monthly salary: ______________</p>
<p>All other terms of your employment, which began on {{employee.hireDate}}, remain unchanged.</p>
<p>Kind regards,<br/>Human Resources</p>'),

(N'Employment Verification Letter', N'Confirms employment for banks, visas, landlords', N'Employment',
N'<h1>To Whom It May Concern</h1>
<p>Date: {{system.currentDate}}</p>
<p>This letter confirms that <strong>{{employee.firstName}} {{employee.lastName}}</strong> has been employed by the Company since {{employee.hireDate}} as <strong>{{employee.position}}</strong> in the {{employee.department}} department, on a {{employee.employmentType}} contract.</p>
<p>This letter is issued at the employee''s request and carries no further obligation for the Company.</p>
<p>Human Resources</p>'),

(N'Welcome and Onboarding Letter', N'Sent to new starters before day one', N'Employment',
N'<h1>Welcome, {{employee.firstName}}!</h1>
<p>We are delighted that you are joining the {{employee.department}} team as {{employee.position}} on {{employee.hireDate}}.</p>
<h3>Your first week</h3>
<ul>
<li>Day 1: meet your manager and mentor, collect your equipment</li>
<li>Day 2&ndash;3: systems access and security training</li>
<li>Day 4&ndash;5: team introductions and first goals</li>
</ul>
<p>Your work email is {{employee.email}}. If anything is unclear, contact Human Resources.</p>
<p>Welcome aboard,<br/>The HR Team</p>'),

(N'Written Warning', N'Formal disciplinary notice', N'Employment',
N'<h1>Written Warning</h1>
<p>Date: {{system.currentDate}}</p>
<p>Employee: {{employee.firstName}} {{employee.lastName}}, {{employee.position}}, {{employee.department}}</p>
<p>This letter is a formal written warning regarding: ______________________________</p>
<p>Expected improvement and timeframe: ______________________________</p>
<p>Failure to improve may lead to further disciplinary action.</p>
<p>Employee acknowledgement (receipt, not agreement): ______________________</p>');

INSERT INTO DocumentTemplates (TemplateID, TemplateName, Description, TemplateContent, TemplateType)
SELECT NEWID(), t.Name, t.Descr, t.Content, t.Type
FROM @t t
WHERE NOT EXISTS (SELECT 1 FROM DocumentTemplates d WHERE d.TemplateName = t.Name);

-- Seeded templates are owned by this script: re-running refreshes their content.
UPDATE d SET Description = t.Descr, TemplateContent = t.Content, TemplateType = t.Type
FROM DocumentTemplates d JOIN @t t ON t.Name = d.TemplateName;

SELECT TemplateName, TemplateType, LEN(TemplateContent) AS Chars FROM DocumentTemplates ORDER BY TemplateType, TemplateName;
