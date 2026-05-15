const bcrypt = require("bcryptjs");
const { query, transaction } = require("../config/db");

async function ensureUser(connection, { name, email, password, role }) {
  const [existing] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
  if (existing[0]) return existing[0].id;

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await connection.execute(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, role]
  );
  return result.insertId;
}

async function main() {
  await transaction(async connection => {
    const adminId = await ensureUser(connection, {
      name: "Abdul Fattah",
      email: "admin@class.local",
      password: "BISMILLAH@admin",
      role: "admin"
    });

    const lecturerUserId = await ensureUser(connection, {
      name: "Dr. Kofi Blake",
      email: "lecturer@class.local",
      password: "lecturer123",
      role: "lecturer"
    });

    const studentUserId = await ensureUser(connection, {
      name: "Mira Stone",
      email: "student@class.local",
      password: "student123",
      role: "student"
    });

    await connection.execute(
      "INSERT IGNORE INTO lecturers (user_id, staff_no, department) VALUES (?, ?, ?)",
      [lecturerUserId, "LEC-101", "Computer Science"]
    );
    await connection.execute(
      "INSERT IGNORE INTO students (user_id, index_no, level) VALUES (?, ?, ?)",
      [studentUserId, "CAS-001", "300"]
    );

    await connection.execute(
      "INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      ["Jon Bell", "jon@class.local", await bcrypt.hash("student123", 12), "student"]
    );
    const [jonRows] = await connection.execute("SELECT id FROM users WHERE email = ?", ["jon@class.local"]);
    await connection.execute(
      "INSERT IGNORE INTO students (user_id, index_no, level) VALUES (?, ?, ?)",
      [jonRows[0].id, "CAS-002", "300"]
    );

    await connection.execute(
      "INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      ["Nia Cole", "nia@class.local", await bcrypt.hash("student123", 12), "student"]
    );
    const [niaRows] = await connection.execute("SELECT id FROM users WHERE email = ?", ["nia@class.local"]);
    await connection.execute(
      "INSERT IGNORE INTO students (user_id, index_no, level) VALUES (?, ?, ?)",
      [niaRows[0].id, "CAS-003", "200"]
    );

    await connection.execute("INSERT IGNORE INTO courses (code, title, credit) VALUES (?, ?, ?)", ["CS301", "Database Systems", 3]);
    await connection.execute("INSERT IGNORE INTO courses (code, title, credit) VALUES (?, ?, ?)", ["CS305", "Web Engineering", 3]);

    const [lecturerRows] = await connection.execute("SELECT id FROM lecturers WHERE user_id = ?", [lecturerUserId]);
    const lecturerId = lecturerRows[0].id;
    const [studentRows] = await connection.execute("SELECT id, index_no AS indexNo FROM students");
    const [courseRows] = await connection.execute("SELECT id, code FROM courses");
    const dbCourse = courseRows.find(item => item.code === "CS301");
    const webCourse = courseRows.find(item => item.code === "CS305");
    const mira = studentRows.find(item => item.indexNo === "CAS-001");
    const jon = studentRows.find(item => item.indexNo === "CAS-002");
    const nia = studentRows.find(item => item.indexNo === "CAS-003");

    for (const student of [mira, jon, nia].filter(Boolean)) {
      await connection.execute("INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)", [student.id, dbCourse.id]);
    }
    await connection.execute("INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)", [mira.id, webCourse.id]);
    await connection.execute("INSERT IGNORE INTO lecturer_courses (lecturer_id, course_id) VALUES (?, ?)", [lecturerId, dbCourse.id]);
    await connection.execute("INSERT IGNORE INTO lecturer_courses (lecturer_id, course_id) VALUES (?, ?)", [lecturerId, webCourse.id]);

    await connection.execute(
      `INSERT INTO class_sessions (course_id, lecturer_id, title, day, start_time, end_time, room, active)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM class_sessions WHERE title = ?)`,
      [dbCourse.id, lecturerId, "Database Systems Lecture", "Friday", "09:00", "11:00", "Lab A", true, "Database Systems Lecture"]
    );
    await connection.execute(
      `INSERT INTO class_sessions (course_id, lecturer_id, title, day, start_time, end_time, room, active)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM class_sessions WHERE title = ?)`,
      [webCourse.id, lecturerId, "Web Engineering Studio", "Monday", "13:00", "15:00", "Studio 2", false, "Web Engineering Studio"]
    );

    const [sessionRows] = await connection.execute("SELECT id FROM class_sessions WHERE title = ?", ["Database Systems Lecture"]);
    const sessionId = sessionRows[0].id;
    const today = new Date().toISOString().slice(0, 10);
    await connection.execute(
      `INSERT INTO attendance_records (student_id, course_id, class_session_id, date, time_in, status, reward_mark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE time_in = VALUES(time_in), status = VALUES(status), reward_mark = VALUES(reward_mark)`,
      [mira.id, dbCourse.id, sessionId, today, "09:03", "present", 1]
    );
    await connection.execute(
      `INSERT INTO attendance_records (student_id, course_id, class_session_id, date, time_in, status, reward_mark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE time_in = VALUES(time_in), status = VALUES(status), reward_mark = VALUES(reward_mark)`,
      [jon.id, dbCourse.id, sessionId, today, "09:24", "late", 0.5]
    );

    await connection.execute(
      `INSERT INTO attendance_issues (student_id, course_id, message)
      SELECT ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM attendance_issues WHERE student_id = ? AND course_id = ? AND message = ?)`,
      [mira.id, dbCourse.id, "Fingerprint scan failed once before it accepted.", mira.id, dbCourse.id, "Fingerprint scan failed once before it accepted."]
    );

    console.log(`Seeded demo data. Admin user id: ${adminId}`);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
