using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class JobsAndBids : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AcceptedBidId",
                table: "Jobs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Jobs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Bids",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContractorName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AmountCents = table.Column<long>(type: "bigint", nullable: false),
                    EarliestStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DurationDays = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    IsAccepted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bids", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bids_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_Status",
                table: "Jobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Bids_JobId",
                table: "Bids",
                column: "JobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bids");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_Status",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "AcceptedBidId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Jobs");
        }
    }
}
