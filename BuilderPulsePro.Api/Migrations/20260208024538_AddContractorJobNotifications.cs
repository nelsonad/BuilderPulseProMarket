using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContractorJobNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorJobNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorJobNotifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorJobNotifications_ContractorUserId",
                table: "ContractorJobNotifications",
                column: "ContractorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorJobNotifications_ContractorUserId_JobId",
                table: "ContractorJobNotifications",
                columns: new[] { "ContractorUserId", "JobId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractorJobNotifications_JobId",
                table: "ContractorJobNotifications",
                column: "JobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorJobNotifications");
        }
    }
}
