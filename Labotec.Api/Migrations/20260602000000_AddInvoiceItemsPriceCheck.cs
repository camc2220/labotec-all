using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Labotec.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceItemsPriceCheck : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_InvoiceItems_Price_NonNegative",
                table: "InvoiceItems",
                sql: "Price >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_InvoiceItems_Price_NonNegative",
                table: "InvoiceItems");
        }
    }
}
