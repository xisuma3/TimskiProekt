using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrApp.Repository.Migrations
{
    /// <inheritdoc />
    public partial class DelegationErasureAuditAccrual : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccrualMethod",
                table: "LeaveEntitlements",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Upfront");

            migrationBuilder.CreateTable(
                name: "ApprovalDelegations",
                columns: table => new
                {
                    DelegationID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DelegatorEmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DelegateEmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartDate = table.Column<DateTime>(type: "date", nullable: false),
                    EndDate = table.Column<DateTime>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CreatedByEmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApprovalDelegations", x => x.DelegationID);
                    table.ForeignKey(
                        name: "FK_ApprovalDelegations_Employees_DelegateEmployeeID",
                        column: x => x.DelegateEmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ApprovalDelegations_Employees_DelegatorEmployeeID",
                        column: x => x.DelegatorEmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ErasureRecords",
                columns: table => new
                {
                    ErasureRecordID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PerformedByEmployeeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PerformedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    RequestedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RequestReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErasureRecords", x => x.ErasureRecordID);
                    table.ForeignKey(
                        name: "FK_ErasureRecords_Employees_EmployeeID",
                        column: x => x.EmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ErasureRecords_Employees_PerformedByEmployeeID",
                        column: x => x.PerformedByEmployeeID,
                        principalTable: "Employees",
                        principalColumn: "EmployeeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests",
                column: "DecidedOnBehalfOfEmployeeID");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalDelegations_DelegateEmployeeID_StartDate_EndDate",
                table: "ApprovalDelegations",
                columns: new[] { "DelegateEmployeeID", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalDelegations_DelegatorEmployeeID_StartDate_EndDate",
                table: "ApprovalDelegations",
                columns: new[] { "DelegatorEmployeeID", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ErasureRecords_EmployeeID",
                table: "ErasureRecords",
                column: "EmployeeID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ErasureRecords_PerformedByEmployeeID",
                table: "ErasureRecords",
                column: "PerformedByEmployeeID");

            migrationBuilder.AddForeignKey(
                name: "FK_LeaveRequests_Employees_DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests",
                column: "DecidedOnBehalfOfEmployeeID",
                principalTable: "Employees",
                principalColumn: "EmployeeID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LeaveRequests_Employees_DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "ApprovalDelegations");

            migrationBuilder.DropTable(
                name: "ErasureRecords");

            migrationBuilder.DropIndex(
                name: "IX_LeaveRequests_DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecidedOnBehalfOfEmployeeID",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "AccrualMethod",
                table: "LeaveEntitlements");
        }
    }
}
