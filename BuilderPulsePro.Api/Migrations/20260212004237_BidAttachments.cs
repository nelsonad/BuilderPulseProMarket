using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidAttachments",
                columns: table => new
                {
                    BidId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttachmentId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidAttachments", x => new { x.BidId, x.AttachmentId });
                    table.ForeignKey(
                        name: "FK_BidAttachments_Attachments_AttachmentId",
                        column: x => x.AttachmentId,
                        principalTable: "Attachments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BidAttachments_Bids_BidId",
                        column: x => x.BidId,
                        principalTable: "Bids",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidAttachments_AttachmentId",
                table: "BidAttachments",
                column: "AttachmentId");

            migrationBuilder.CreateIndex(
                name: "IX_BidAttachments_BidId",
                table: "BidAttachments",
                column: "BidId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidAttachments");
        }
    }
}
