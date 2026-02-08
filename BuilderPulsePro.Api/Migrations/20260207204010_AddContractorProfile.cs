using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContractorProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorProfiles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TradesCsv = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    HomeBase = table.Column<Point>(type: "geography (point)", nullable: false),
                    ServiceRadiusMeters = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorProfiles", x => x.UserId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorProfiles_HomeBase",
                table: "ContractorProfiles",
                column: "HomeBase")
                .Annotation("Npgsql:IndexMethod", "gist");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorProfiles");
        }
    }
}
