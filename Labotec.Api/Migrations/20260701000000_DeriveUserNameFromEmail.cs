using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Labotec.Api.Migrations
{
    /// <inheritdoc />
    public partial class DeriveUserNameFromEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE `AspNetUsers`
SET
    `UserName` = CASE
        WHEN LOCATE('@', `Email`) > 1 THEN SUBSTRING(`Email`, 1, LOCATE('@', `Email`) - 1)
        ELSE `Email`
    END,
    `NormalizedUserName` = UPPER(CASE
        WHEN LOCATE('@', `Email`) > 1 THEN SUBSTRING(`Email`, 1, LOCATE('@', `Email`) - 1)
        ELSE `Email`
    END)
WHERE `Email` IS NOT NULL AND `Email` <> '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE `AspNetUsers`
SET
    `UserName` = `Email`,
    `NormalizedUserName` = UPPER(`Email`)
WHERE `Email` IS NOT NULL AND `Email` <> '';");
        }
    }
}
