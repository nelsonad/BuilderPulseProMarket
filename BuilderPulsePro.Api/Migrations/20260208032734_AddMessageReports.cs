using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MessageReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReporterUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResolvedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageReports", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MessageReports_MessageId",
                table: "MessageReports",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReports_ReporterUserId",
                table: "MessageReports",
                column: "ReporterUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReports_ResolvedAt",
                table: "MessageReports",
                column: "ResolvedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MessageReports");
        }
    }
}
