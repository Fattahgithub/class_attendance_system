const mysql = require("mysql2/promise");
require("dotenv").config();

const database = process.env.DB_NAME || "class_attendance_system";

const baseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  multipleStatements: true
};

const pool = mysql.createPool({
  ...baseConfig,
  database
});

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createAdminConnection() {
  return mysql.createConnection(baseConfig);
}

module.exports = {
  database,
  pool,
  query,
  transaction,
  createAdminConnection
};
