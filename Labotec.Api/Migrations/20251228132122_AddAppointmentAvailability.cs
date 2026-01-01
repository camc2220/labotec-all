using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Labotec.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppointmentAvailabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Day = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Time = table.Column<string>(type: "varchar(5)", maxLength: 5, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Slots = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentAvailabilities", x => x.Id);
                    table.CheckConstraint("CK_AppointmentAvailabilities_Slots_NonNegative", "Slots >= 0");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentAvailabilities_StartUtc",
                table: "AppointmentAvailabilities",
                column: "StartUtc",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentAvailabilities");
        }
    }
}
