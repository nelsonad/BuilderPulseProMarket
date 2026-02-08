using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "Contractors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HomeBase = table.Column<Point>(type: "geography (point)", nullable: false),
                    ServiceRadiusMeters = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contractors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Trade = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SiteLocation = table.Column<Point>(type: "geography (point)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contractors_HomeBase",
                table: "Contractors",
                column: "HomeBase")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_SiteLocation",
                table: "Jobs",
                column: "SiteLocation")
                .Annotation("Npgsql:IndexMethod", "gist");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Contractors");

            migrationBuilder.DropTable(
                name: "Jobs");
        }
    }
}
