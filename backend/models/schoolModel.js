const { query, transaction } = require("../config/db");
const userModel = require("./userModel");

async function students() {
  return query(
    `SELECT
      s.id,
      s.user_id AS userId,
      u.name,
      s.index_no AS indexNo,
      u.email,
      s.level,
      s.profile_photo AS profilePhoto
    FROM students s
    INNER JOIN users u ON u.id = s.user_id
    ORDER BY u.name`
  );
}

async function lecturers() {
  return query(
    `SELECT l.id, l.user_id AS userId, u.name, l.staff_no AS staffNo, u.email, l.department
    FROM lecturers l
    INNER JOIN users u ON u.id = l.user_id
    ORDER BY u.name`
  );
}

async function courses() {
  return query("SELECT id, code, title, credit FROM courses ORDER BY code");
}

async function studentCourses() {
  return query("SELECT student_id AS studentId, course_id AS courseId FROM student_courses");
}

async function lecturerCourses() {
  return query("SELECT lecturer_id AS lecturerId, course_id AS courseId FROM lecturer_courses");
}

async function classSessions() {
  return query(
    `SELECT
      id,
      course_id AS courseId,
      lecturer_id AS lecturerId,
      title,
      day,
      TIME_FORMAT(start_time, '%H:%i') AS startTime,
      TIME_FORMAT(end_time, '%H:%i') AS endTime,
      room,
      active = 1 AS active
    FROM class_sessions
    ORDER BY FIELD(day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), start_time`
  );
}

async function attendanceIssues() {
  return query(
    `SELECT
      id,
      student_id AS studentId,
      course_id AS courseId,
      message,
      status,
      created_at AS createdAt
    FROM attendance_issues
    ORDER BY created_at DESC`
  );
}

async function fingerprints() {
  return require("./fingerprintModel").all();
}

async function bootstrap() {
  const [
    studentRows,
    lecturerRows,
    courseRows,
    studentCourseRows,
    lecturerCourseRows,
    sessionRows,
    attendanceRecords,
    issueRows,
    fingerprintRows
  ] = await Promise.all([
    students(),
    lecturers(),
    courses(),
    studentCourses(),
    lecturerCourses(),
    classSessions(),
    require("./attendanceModel").allRecords(),
    attendanceIssues(),
    fingerprints()
  ]);

  return {
    students: studentRows,
    lecturers: lecturerRows,
    courses: courseRows,
    studentCourses: studentCourseRows,
    lecturerCourses: lecturerCourseRows,
    classSessions: sessionRows,
    attendanceRecords,
    attendanceIssues: issueRows,
    fingerprints: fingerprintRows
  };
}

async function updateStudent(id, body) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM students WHERE id = ?", [id]);
    if (!rows[0]) throw new Error("Student not found.");
    await connection.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [body.name, body.email, rows[0].userId]);
    await connection.execute("UPDATE students SET index_no = ?, level = ? WHERE id = ?", [body.indexNo, body.level, id]);
  });
}

async function updateStudentProfile(id, body) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM students WHERE id = ?", [id]);
    if (!rows[0]) throw new Error("Student not found.");
    await connection.execute("UPDATE users SET name = ? WHERE id = ?", [body.name, rows[0].userId]);
    await connection.execute("UPDATE students SET profile_photo = COALESCE(?, profile_photo) WHERE id = ?", [body.profilePhoto || null, id]);
  });
}

async function changeStudentPassword(id, passwordHash) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM students WHERE id = ?", [id]);
    if (!rows[0]) throw new Error("Student not found.");
    await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, rows[0].userId]);
  });
}

async function deleteStudent(id) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM students WHERE id = ?", [id]);
    if (!rows[0]) return;
    await connection.execute("DELETE FROM attendance_issues WHERE student_id = ?", [id]);
    await connection.execute("DELETE FROM attendance_records WHERE student_id = ?", [id]);
    await connection.execute("DELETE FROM attendance_rewards WHERE student_id = ?", [id]);
    await connection.execute("DELETE FROM fingerprints WHERE student_id = ?", [id]);
    await connection.execute("DELETE FROM student_courses WHERE student_id = ?", [id]);
    await connection.execute("DELETE FROM students WHERE id = ?", [id]);
    await connection.execute("DELETE FROM users WHERE id = ?", [rows[0].userId]);
  });
}

async function updateLecturer(id, body) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM lecturers WHERE id = ?", [id]);
    if (!rows[0]) throw new Error("Lecturer not found.");
    await connection.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [body.name, body.email, rows[0].userId]);
    await connection.execute("UPDATE lecturers SET staff_no = ?, department = ? WHERE id = ?", [body.staffNo, body.department, id]);
  });
}

async function deleteLecturer(id) {
  return transaction(async connection => {
    const [rows] = await connection.execute("SELECT user_id AS userId FROM lecturers WHERE id = ?", [id]);
    if (!rows[0]) return;
    await connection.execute(
      "DELETE ar FROM attendance_records ar INNER JOIN class_sessions cs ON cs.id = ar.class_session_id WHERE cs.lecturer_id = ?",
      [id]
    );
    await connection.execute("DELETE FROM class_sessions WHERE lecturer_id = ?", [id]);
    await connection.execute("DELETE FROM lecturer_courses WHERE lecturer_id = ?", [id]);
    await connection.execute("DELETE FROM lecturers WHERE id = ?", [id]);
    await connection.execute("DELETE FROM users WHERE id = ?", [rows[0].userId]);
  });
}

async function createCourse(body) {
  await query(
    "INSERT INTO courses (code, title, credit) VALUES (:code, :title, :credit)",
    { code: body.code, title: body.title, credit: Number(body.credit || 3) }
  );
}

async function updateCourse(id, body) {
  await query(
    "UPDATE courses SET code = :code, title = :title, credit = :credit WHERE id = :id",
    { id, code: body.code, title: body.title, credit: Number(body.credit || 3) }
  );
}

async function deleteCourse(id) {
  return transaction(async connection => {
    await connection.execute("DELETE FROM attendance_issues WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM attendance_rewards WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM attendance_records WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM class_sessions WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM student_courses WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM lecturer_courses WHERE course_id = ?", [id]);
    await connection.execute("DELETE FROM courses WHERE id = ?", [id]);
  });
}

async function assignStudent(body) {
  await query(
    "INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (:studentId, :courseId)",
    { studentId: Number(body.studentId), courseId: Number(body.courseId) }
  );
}

async function assignLecturer(body) {
  await query(
    "INSERT IGNORE INTO lecturer_courses (lecturer_id, course_id) VALUES (:lecturerId, :courseId)",
    { lecturerId: Number(body.lecturerId), courseId: Number(body.courseId) }
  );
}

async function createSession(body) {
  await query(
    `INSERT INTO class_sessions
      (course_id, lecturer_id, title, day, start_time, end_time, room, active)
    VALUES
      (:courseId, :lecturerId, :title, :day, :startTime, :endTime, :room, :active)`,
    {
      courseId: Number(body.courseId),
      lecturerId: Number(body.lecturerId),
      title: body.title,
      day: body.day,
      startTime: body.startTime,
      endTime: body.endTime,
      room: body.room,
      active: body.active === true || body.active === "true" || body.active === "1"
    }
  );
}

async function updateSession(id, body) {
  await query(
    `UPDATE class_sessions SET
      course_id = :courseId,
      lecturer_id = :lecturerId,
      title = :title,
      day = :day,
      start_time = :startTime,
      end_time = :endTime,
      room = :room,
      active = :active
    WHERE id = :id`,
    {
      id,
      courseId: Number(body.courseId),
      lecturerId: Number(body.lecturerId),
      title: body.title,
      day: body.day,
      startTime: body.startTime,
      endTime: body.endTime,
      room: body.room,
      active: body.active === true || body.active === "true" || body.active === "1"
    }
  );
}

async function deleteSession(id) {
  return transaction(async connection => {
    await connection.execute("DELETE FROM attendance_records WHERE class_session_id = ?", [id]);
    await connection.execute("DELETE FROM class_sessions WHERE id = ?", [id]);
  });
}

async function createIssue(body) {
  await query(
    "INSERT INTO attendance_issues (student_id, course_id, message) VALUES (:studentId, :courseId, :message)",
    { studentId: Number(body.studentId), courseId: Number(body.courseId), message: body.message }
  );
}

module.exports = {
  bootstrap,
  createCourse,
  updateCourse,
  deleteCourse,
  assignStudent,
  assignLecturer,
  createSession,
  updateSession,
  deleteSession,
  updateStudent,
  updateStudentProfile,
  changeStudentPassword,
  deleteStudent,
  updateLecturer,
  deleteLecturer,
  createIssue,
  userModel
};
