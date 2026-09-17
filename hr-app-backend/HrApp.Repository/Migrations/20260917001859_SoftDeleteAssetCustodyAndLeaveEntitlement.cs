using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrApp.Repository.Migrations
{
    /// <inheritdoc />
    public partial class SoftDeleteAssetCustodyAndLeaveEntitlement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- Bridging step -------------------------------------------------------
            // This database predates EF migrations: its tables were created by hand, so
            // its constraints carry SQL Server's auto-generated names (FK__Assets__Employee__3D5E1FD2,
            // UQ__Employee__A9D1...) rather than EF's conventions, and Assets even carries
            // two foreign keys on the same column. Dropping by EF's expected name fails
            // there. These statements drop whatever is actually present, by column, so the
            // migration works on both a legacy database and one built from InitialBaseline.
            // Everything after this point is EF-canonical.
            migrationBuilder.Sql(@"
                DECLARE @sql NVARCHAR(MAX) = N'';

                -- Every FK on the three Employee-referencing columns we are about to
                -- re-point at Restrict, whatever it happens to be called.
                SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
                                   + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(10)
                FROM sys.foreign_keys fk
                JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
                JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
                WHERE OBJECT_NAME(fk.referenced_object_id) = 'Employees'
                  AND c.name = 'EmployeeID'
                  AND OBJECT_NAME(fk.parent_object_id) IN ('Assets', 'GeneratedDocuments', 'LeaveRequests');

                -- The unique constraint / index on Employees.Email, whichever form it takes.
                -- It is replaced below by a filtered index so a retired employee does not
                -- permanently reserve their address.
                SELECT @sql = @sql + N'ALTER TABLE [Employees] DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';' + CHAR(10)
                FROM sys.key_constraints kc
                JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE kc.parent_object_id = OBJECT_ID('Employees') AND kc.type = 'UQ' AND c.name = 'Email';

                SELECT @sql = @sql + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON [Employees];' + CHAR(10)
                FROM sys.indexes i
                JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE i.object_id = OBJECT_ID('Employees') AND i.is_unique = 1 AND i.is_primary_key = 0
                  AND c.name = 'Email'
                  AND NOT EXISTS (SELECT 1 FROM sys.key_constraints kc2 WHERE kc2.unique_index_id = i.index_id AND kc2.parent_object_id = i.object_id);

                EXEC sp_executesql @sql;
            ");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "EmployeeID",
                table: "Assets",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<DateTime>(
                name: "AssignmentDate",
                table: "Assets",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldDefaultValueSql: "GETDATE()");

            migrationBuilder.CreateTable(
                name: "AssetAssignments",
                columns: table => new
                {
                    AssignmentID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedDate = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    ReturnedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReturnCondition = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetAssignments", x => x.AssignmentID);
                    table.ForeignKey(
                        name: "FK_AssetAssignments_Assets_AssetID",
                        column: x => x.AssetID,
                        principalTable: "Assets",
                        principalColumn: "AssetID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssetAssignments_Employees_EmployeeID",
                        column: x => x.EmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LeaveEntitlements",
                columns: table => new
                {
                    EntitlementID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    LeaveType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DaysAllocated = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    DaysCarriedOver = table.Column<decimal>(type: "decimal(5,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveEntitlements", x => x.EntitlementID);
                    table.ForeignKey(
                        name: "FK_LeaveEntitlements_Employees_EmployeeID",
                        column: x => x.EmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_IsDeleted",
                table: "Employees",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAssignments_AssetID_ReturnedDate",
                table: "AssetAssignments",
                columns: new[] { "AssetID", "ReturnedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_AssetAssignments_EmployeeID_ReturnedDate",
                table: "AssetAssignments",
                columns: new[] { "EmployeeID", "ReturnedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveEntitlements_EmployeeID_Year_LeaveType",
                table: "LeaveEntitlements",
                columns: new[] { "EmployeeID", "Year", "LeaveType" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Employees_EmployeeID",
                table: "Assets",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GeneratedDocuments_Employees_EmployeeID",
                table: "GeneratedDocuments",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRequests_Employees_EmployeeID",
                table: "LeaveRequests",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Restrict);

            // Backfill the custody chain for assets that were already assigned. Without
            // this, every existing asset looks like it has never been handed to anyone:
            // Return would report "already in stock" and the history would start empty.
            // The opening record is left open (ReturnedDate NULL) because the employee
            // still holds it.
            migrationBuilder.Sql(@"
                INSERT INTO AssetAssignments (AssignmentID, AssetID, EmployeeID, AssignedDate, ReturnedDate, Notes)
                SELECT NEWID(), a.AssetID, a.EmployeeID,
                       COALESCE(a.AssignmentDate, GETDATE()), NULL,
                       'Backfilled from the asset record when custody tracking was introduced'
                FROM Assets a
                WHERE a.EmployeeID IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM AssetAssignments x WHERE x.AssetID = a.AssetID);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Employees_EmployeeID",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_GeneratedDocuments_Employees_EmployeeID",
                table: "GeneratedDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_LeaveRequests_Employees_EmployeeID",
                table: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "AssetAssignments");

            migrationBuilder.DropTable(
                name: "LeaveEntitlements");

            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_IsDeleted",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Employees");

            migrationBuilder.AlterColumn<Guid>(
                name: "EmployeeID",
                table: "Assets",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "AssignmentDate",
                table: "Assets",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETDATE()",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Employees_EmployeeID",
                table: "Assets",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GeneratedDocuments_Employees_EmployeeID",
                table: "GeneratedDocuments",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRequests_Employees_EmployeeID",
                table: "LeaveRequests",
                column: "EmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
