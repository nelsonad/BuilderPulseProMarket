using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidTerms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Assumptions",
                table: "Bids",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Terms",
                table: "Bids",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ValidUntil",
                table: "Bids",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Assumptions",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "Terms",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "ValidUntil",
                table: "Bids");
        }
    }
}
