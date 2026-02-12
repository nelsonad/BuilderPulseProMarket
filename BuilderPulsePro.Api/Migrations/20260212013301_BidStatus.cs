using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Bids",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Bids_Status",
                table: "Bids",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bids_Status",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Bids");
        }
    }
}
