using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Labotec.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentStatusHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterTable(
                name: "InvoiceItems")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<decimal>(
                name: "DefaultPrice",
                table: "LabTests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                table: "LabOrderItems",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "Invoices",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(65,30)");

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Appointments",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CanceledAt",
                table: "Appointments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CanceledByUserId",
                table: "Appointments",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedInAt",
                table: "Appointments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckedInByUserId",
                table: "Appointments",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Appointments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletedByUserId",
                table: "Appointments",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "NoShowAt",
                table: "Appointments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NoShowByUserId",
                table: "Appointments",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Appointments",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StartedByUserId",
                table: "Appointments",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

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

            migrationBuilder.CreateTable(
                name: "AppointmentStatusHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    AppointmentId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    FromStatus = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ToStatus = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ChangedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ChangedByUserId = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppointmentStatusHistory_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AvailabilitySlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    StartUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Capacity = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedByUserId = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AvailabilitySlots", x => x.Id);
                    table.CheckConstraint("CK_AvailabilitySlots_Capacity_NonNegative", "Capacity >= 0");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LabTestReferenceRanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LabTestId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Sex = table.Column<string>(type: "varchar(1)", maxLength: 1, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AgeMinYears = table.Column<int>(type: "int", nullable: true),
                    AgeMaxYears = table.Column<int>(type: "int", nullable: true),
                    MinValue = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    MaxValue = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    TextRange = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Unit = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabTestReferenceRanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabTestReferenceRanges_LabTests_LabTestId",
                        column: x => x.LabTestId,
                        principalTable: "LabTests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "SchedulingSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    MaxPatientsPerHour = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchedulingSettings", x => x.Id);
                    table.CheckConstraint("CK_SchedulingSettings_MaxPatientsPerHour_Positive", "MaxPatientsPerHour > 0");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LabOrderItems_Price_NonNegative",
                table: "LabOrderItems",
                sql: "Price >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_Status",
                table: "Appointments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentAvailabilities_StartUtc",
                table: "AppointmentAvailabilities",
                column: "StartUtc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentStatusHistory_AppointmentId",
                table: "AppointmentStatusHistory",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AvailabilitySlots_StartUtc",
                table: "AvailabilitySlots",
                column: "StartUtc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabTestReferenceRanges_LabTestId",
                table: "LabTestReferenceRanges",
                column: "LabTestId");

            migrationBuilder.CreateIndex(
                name: "IX_LabTestReferenceRanges_LabTestId_Sex_AgeMinYears_AgeMaxYears",
                table: "LabTestReferenceRanges",
                columns: new[] { "LabTestId", "Sex", "AgeMinYears", "AgeMaxYears" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentAvailabilities");

            migrationBuilder.DropTable(
                name: "AppointmentStatusHistory");

            migrationBuilder.DropTable(
                name: "AvailabilitySlots");

            migrationBuilder.DropTable(
                name: "LabTestReferenceRanges");

            migrationBuilder.DropTable(
                name: "SchedulingSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LabOrderItems_Price_NonNegative",
                table: "LabOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_Status",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CanceledAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CanceledByUserId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CheckedInByUserId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CompletedByUserId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "NoShowAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "NoShowByUserId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "StartedByUserId",
                table: "Appointments");

            migrationBuilder.AlterTable(
                name: "InvoiceItems")
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "ascii_general_ci")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<decimal>(
                name: "DefaultPrice",
                table: "LabTests",
                type: "decimal(65,30)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                table: "LabOrderItems",
                type: "decimal(65,30)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Amount",
                table: "Invoices",
                type: "decimal(65,30)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2);

            migrationBuilder.AlterColumn<Guid>(
                name: "LabTestId",
                table: "InvoiceItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "InvoiceId",
                table: "InvoiceItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "InvoiceItems",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Appointments",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(500)",
                oldMaxLength: 500,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
