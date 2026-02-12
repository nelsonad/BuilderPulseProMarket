using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidVariants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidVariants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BidId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AmountCents = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidVariants_Bids_BidId",
                        column: x => x.BidId,
                        principalTable: "Bids",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BidVariantLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BidVariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceCents = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidVariantLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidVariantLineItems_BidVariants_BidVariantId",
                        column: x => x.BidVariantId,
                        principalTable: "BidVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidVariantLineItems_BidVariantId",
                table: "BidVariantLineItems",
                column: "BidVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_BidVariantLineItems_BidVariantId_SortOrder",
                table: "BidVariantLineItems",
                columns: new[] { "BidVariantId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_BidVariants_BidId",
                table: "BidVariants",
                column: "BidId");

            migrationBuilder.CreateIndex(
                name: "IX_BidVariants_BidId_SortOrder",
                table: "BidVariants",
                columns: new[] { "BidId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidVariantLineItems");

            migrationBuilder.DropTable(
                name: "BidVariants");
        }
    }
}
