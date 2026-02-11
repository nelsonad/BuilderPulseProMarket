using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class SystemAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_JobAttachments",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "Content",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "SizeBytes",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "StorageProvider",
                table: "JobAttachments");

            migrationBuilder.DropColumn(
                name: "StorageUrl",
                table: "JobAttachments");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "JobAttachments",
                newName: "AttachmentId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_JobAttachments",
                table: "JobAttachments",
                columns: new[] { "JobId", "AttachmentId" });

            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StorageProvider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StorageUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Content = table.Column<byte[]>(type: "bytea", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobAttachments_AttachmentId",
                table: "JobAttachments",
                column: "AttachmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobAttachments_Attachments_AttachmentId",
                table: "JobAttachments",
                column: "AttachmentId",
                principalTable: "Attachments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobAttachments_Attachments_AttachmentId",
                table: "JobAttachments");

            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_JobAttachments",
                table: "JobAttachments");

            migrationBuilder.DropIndex(
                name: "IX_JobAttachments_AttachmentId",
                table: "JobAttachments");

            migrationBuilder.RenameColumn(
                name: "AttachmentId",
                table: "JobAttachments",
                newName: "Id");

            migrationBuilder.AddColumn<byte[]>(
                name: "Content",
                table: "JobAttachments",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "JobAttachments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "JobAttachments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "JobAttachments",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "SizeBytes",
                table: "JobAttachments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "JobAttachments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StorageProvider",
                table: "JobAttachments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StorageUrl",
                table: "JobAttachments",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_JobAttachments",
                table: "JobAttachments",
                column: "Id");
        }
    }
}
