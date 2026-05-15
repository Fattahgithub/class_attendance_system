const fs = require("fs");
const path = require("path");
const { createAdminConnection } = require("../config/db");

async function main() {
  const schemaPath = path.join(__dirname, "..", "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
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
