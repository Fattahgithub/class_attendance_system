const fs = require("fs");
const path = require("path");
const { createAdminConnection } = require("../config/db");

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function main() {
  const connection = await createAdminConnection();
  try {
    await connection.query(`USE ${process.env.DB_NAME || "class_attendance_system"}`);

    if (!await columnExists(connection, "students", "profile_photo")) {
      const migrationPath = path.join(__dirname, "..", "..", "database", "migrations", "001_student_profile_photo.sql");
      const migration = fs.readFileSync(migrationPath, "utf8");
      await connection.query(migration);
      console.log("Applied migration: student profile photo");
    } else {
      console.log("No migrations needed.");
    }
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
