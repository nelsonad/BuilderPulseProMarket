using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidContractorProfileId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContractorName",
                table: "Bids");

            migrationBuilder.AddColumn<Guid>(
                name: "ContractorProfileId",
                table: "Bids",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Bids_ContractorProfileId",
                table: "Bids",
                column: "ContractorProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bids_ContractorProfileId",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "ContractorProfileId",
                table: "Bids");

            migrationBuilder.AddColumn<string>(
                name: "ContractorName",
                table: "Bids",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}
