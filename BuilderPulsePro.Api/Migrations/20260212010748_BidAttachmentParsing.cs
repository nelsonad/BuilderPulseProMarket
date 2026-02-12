using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class BidAttachmentParsing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidAttachmentParseJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BidId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttachmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResultJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidAttachmentParseJobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidAttachmentParseJobs_AttachmentId",
                table: "BidAttachmentParseJobs",
                column: "AttachmentId");

            migrationBuilder.CreateIndex(
                name: "IX_BidAttachmentParseJobs_BidId",
                table: "BidAttachmentParseJobs",
                column: "BidId");

            migrationBuilder.CreateIndex(
                name: "IX_BidAttachmentParseJobs_BidId_AttachmentId",
                table: "BidAttachmentParseJobs",
                columns: new[] { "BidId", "AttachmentId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidAttachmentParseJobs");
        }
    }
}
