using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidRevisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BidId = table.Column<Guid>(type: "uuid", nullable: false),
                    RevisionNumber = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SnapshotJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidRevisions_Bids_BidId",
                        column: x => x.BidId,
                        principalTable: "Bids",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidRevisions_BidId",
                table: "BidRevisions",
                column: "BidId");

            migrationBuilder.CreateIndex(
                name: "IX_BidRevisions_BidId_RevisionNumber",
                table: "BidRevisions",
                columns: new[] { "BidId", "RevisionNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidRevisions");
        }
    }
}
