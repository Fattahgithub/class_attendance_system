const { query, transaction } = require("../config/db");

async function findByEmail(email) {
  const rows = await query(
    `SELECT
      u.id, u.name, u.email, u.password_hash AS passwordHash, u.role,
      s.id AS studentId,
      l.id AS lecturerId
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN lecturers l ON l.user_id = u.id
    WHERE u.email = :email
    LIMIT 1`,
    { email }
  );
  return rows[0];
}

async function createPerson({ name, email, passwordHash, role, profile }) {
  return transaction(async connection => {
    const [userResult] = await connection.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );
    const userId = userResult.insertId;

    if (role === "student") {
      const [studentResult] = await connection.execute(
        "INSERT INTO students (user_id, index_no, level) VALUES (?, ?, ?)",
        [userId, profile.indexNo, profile.level || "100"]
      );
      return { userId, profileId: studentResult.insertId };
    }

    if (role === "lecturer") {
      const [lecturerResult] = await connection.execute(
        "INSERT INTO lecturers (user_id, staff_no, department) VALUES (?, ?, ?)",
        [userId, profile.staffNo, profile.department || "General"]
      );
      return { userId, profileId: lecturerResult.insertId };
    }

    return { userId };
  });
}

async function updateUser(id, fields) {
  await query(
    "UPDATE users SET name = :name, email = :email WHERE id = :id",
    { id, name: fields.name, email: fields.email }
  );
}

async function removeUser(id) {
  await query("DELETE FROM users WHERE id = :id", { id });
}

module.exports = {
  findByEmail,
  createPerson,
  updateUser,
  removeUser
};
