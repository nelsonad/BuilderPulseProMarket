using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RevieweeUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Body = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_JobId",
                table: "Reviews",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_JobId_ReviewerUserId",
                table: "Reviews",
                columns: new[] { "JobId", "ReviewerUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_RevieweeUserId",
                table: "Reviews",
                column: "RevieweeUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Reviews");
        }
    }
}
