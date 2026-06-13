using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WaterFix.API.Migrations
{
    /// <inheritdoc />
    public partial class EmailNotif : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EmailNotificationsEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

            

           
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
           
            migrationBuilder.DropColumn(
                name: "EmailNotificationsEnabled",
                table: "Users");
        }
    }
}
