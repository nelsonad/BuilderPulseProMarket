using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContractorServiceAreas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorServiceAreas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractorProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Center = table.Column<Point>(type: "geography (point)", nullable: false),
                    RadiusMeters = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorServiceAreas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractorServiceAreas_ContractorProfiles_ContractorProfile~",
                        column: x => x.ContractorProfileId,
                        principalTable: "ContractorProfiles",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorServiceAreas_Center",
                table: "ContractorServiceAreas",
                column: "Center")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorServiceAreas_ContractorProfileId",
                table: "ContractorServiceAreas",
                column: "ContractorProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorServiceAreas");
        }
    }
}
