using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HrApp.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AssetOptionalDescriptionAndSerial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Same bridging concern as the previous migration: on a legacy database the
            // uniqueness on Assets.SerialNumber is an auto-named UNIQUE CONSTRAINT
            // (UQ__Assets__048A...), not an EF-named index, so dropping it by EF's name
            // fails. Drop whatever form is actually present; the filtered index created
            // below is EF-canonical either way.
            migrationBuilder.Sql(@"
                DECLARE @sql NVARCHAR(MAX) = N'';

                SELECT @sql = @sql + N'ALTER TABLE [Assets] DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';' + CHAR(10)
                FROM sys.key_constraints kc
                JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE kc.parent_object_id = OBJECT_ID('Assets') AND kc.type = 'UQ' AND c.name = 'SerialNumber';

                SELECT @sql = @sql + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON [Assets];' + CHAR(10)
                FROM sys.indexes i
                JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE i.object_id = OBJECT_ID('Assets') AND i.is_unique = 1 AND i.is_primary_key = 0
                  AND c.name = 'SerialNumber'
                  AND NOT EXISTS (SELECT 1 FROM sys.key_constraints kc2 WHERE kc2.unique_index_id = i.index_id AND kc2.parent_object_id = i.object_id);

                EXEC sp_executesql @sql;
            ");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "Assets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Assets",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_SerialNumber",
                table: "Assets",
                column: "SerialNumber",
                unique: true,
                filter: "[SerialNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Assets_SerialNumber",
                table: "Assets");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "Assets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Assets",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_SerialNumber",
                table: "Assets",
                column: "SerialNumber",
                unique: true);
        }
    }
}
