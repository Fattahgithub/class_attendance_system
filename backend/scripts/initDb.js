const fs = require("fs");
const path = require("path");
const { createAdminConnection, database } = require("../config/db");

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function main() {
  const schemaPath = path.join(__dirname, "..", "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8")
    .replace(/CREATE DATABASE IF NOT EXISTS class_attendance_system;/i, `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(database)};`)
    .replace(/USE class_attendance_system;/i, `USE ${escapeIdentifier(database)};`);
  const connection = await createAdminConnection();

  try {
    await connection.query(schema);
    console.log("MySQL database created from database/schema.sql");
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
