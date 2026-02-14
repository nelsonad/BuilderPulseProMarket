using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class ContractorAuthorizedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorAuthorizedUsers",
                columns: table => new
                {
                    ContractorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorAuthorizedUsers", x => new { x.ContractorProfileId, x.UserId });
                    table.ForeignKey(
                        name: "FK_ContractorAuthorizedUsers_ContractorProfiles_ContractorProf~",
                        column: x => x.ContractorProfileId,
                        principalTable: "ContractorProfiles",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorAuthorizedUsers_UserId",
                table: "ContractorAuthorizedUsers",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorAuthorizedUsers");
        }
    }
}
