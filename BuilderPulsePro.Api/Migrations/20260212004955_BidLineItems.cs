using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidLineItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BidId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceCents = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidLineItems_Bids_BidId",
                        column: x => x.BidId,
                        principalTable: "Bids",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidLineItems_BidId",
                table: "BidLineItems",
                column: "BidId");

            migrationBuilder.CreateIndex(
                name: "IX_BidLineItems_BidId_SortOrder",
                table: "BidLineItems",
                columns: new[] { "BidId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidLineItems");
        }
    }
}
