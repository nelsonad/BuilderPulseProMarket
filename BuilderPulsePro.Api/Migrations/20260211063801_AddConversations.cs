using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BuilderPulsePro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Conversations_JobId",
                table: "Conversations");

            migrationBuilder.RenameColumn(
                name: "PosterUserId",
                table: "Conversations",
                newName: "ContractorProfileId");

            migrationBuilder.RenameColumn(
                name: "ContractorUserId",
                table: "Conversations",
                newName: "ClientUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_PosterUserId",
                table: "Conversations",
                newName: "IX_Conversations_ContractorProfileId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_ContractorUserId",
                table: "Conversations",
                newName: "IX_Conversations_ClientUserId");

            migrationBuilder.AddColumn<Guid>(
                name: "ClientUserId",
                table: "Messages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ContractorProfileId",
                table: "Messages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EditedAt",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReadAt",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecipientUserId",
                table: "Messages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "MessageAttachments",
                columns: table => new
                {
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttachmentId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageAttachments", x => new { x.MessageId, x.AttachmentId });
                    table.ForeignKey(
                        name: "FK_MessageAttachments_Attachments_AttachmentId",
                        column: x => x.AttachmentId,
                        principalTable: "Attachments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageAttachments_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ClientUserId",
                table: "Messages",
                column: "ClientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ContractorProfileId",
                table: "Messages",
                column: "ContractorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ReadAt",
                table: "Messages",
                column: "ReadAt");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_RecipientUserId",
                table: "Messages",
                column: "RecipientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_JobId_ContractorProfileId",
                table: "Conversations",
                columns: new[] { "JobId", "ContractorProfileId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MessageAttachments_AttachmentId",
                table: "MessageAttachments",
                column: "AttachmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageAttachments_MessageId",
                table: "MessageAttachments",
                column: "MessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MessageAttachments");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ClientUserId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ContractorProfileId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ReadAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_RecipientUserId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_JobId_ContractorProfileId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "ClientUserId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ContractorProfileId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "EditedAt",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ReadAt",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "RecipientUserId",
                table: "Messages");

            migrationBuilder.RenameColumn(
                name: "ContractorProfileId",
                table: "Conversations",
                newName: "PosterUserId");

            migrationBuilder.RenameColumn(
                name: "ClientUserId",
                table: "Conversations",
                newName: "ContractorUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_ContractorProfileId",
                table: "Conversations",
                newName: "IX_Conversations_PosterUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_ClientUserId",
                table: "Conversations",
                newName: "IX_Conversations_ContractorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_JobId",
                table: "Conversations",
                column: "JobId",
                unique: true);
        }
    }
}
