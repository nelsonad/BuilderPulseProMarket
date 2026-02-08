using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidderUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BidderUserId",
                table: "Bids",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Bids_BidderUserId",
                table: "Bids",
                column: "BidderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Bids_JobId_BidderUserId",
                table: "Bids",
                columns: new[] { "JobId", "BidderUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bids_BidderUserId",
                table: "Bids");

            migrationBuilder.DropIndex(
                name: "IX_Bids_JobId_BidderUserId",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "BidderUserId",
                table: "Bids");
        }
    }
}
