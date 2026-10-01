using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrApp.Repository.Migrations
{
    /// <inheritdoc />
    public partial class TemplateSelfService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowSelfService",
                table: "DocumentTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowSelfService",
                table: "DocumentTemplates");
        }
    }
}
