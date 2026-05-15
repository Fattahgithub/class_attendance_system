const { query } = require("../config/db");
const attendanceModel = require("./attendanceModel");

async function all() {
  return query(
    `SELECT
      f.id,
      f.student_id AS studentId,
      u.name AS student,
      s.index_no AS indexNo,
      f.template_hash AS templateHash,
      f.scanner_provider AS scannerProvider,
      f.created_at AS createdAt
    FROM fingerprints f
    INNER JOIN students s ON s.id = f.student_id
    INNER JOIN users u ON u.id = s.user_id
    ORDER BY f.created_at DESC`
  );
}

async function enroll(body) {
  await query(
    `INSERT INTO fingerprints (student_id, template_hash, scanner_provider)
    VALUES (:studentId, :templateHash, :scannerProvider)
    ON DUPLICATE KEY UPDATE
      template_hash = VALUES(template_hash),
      scanner_provider = VALUES(scanner_provider)`,
    {
      studentId: Number(body.studentId),
      templateHash: body.templateHash,
      scannerProvider: body.scannerProvider || "Manual SDK bridge"
    }
  );
}

async function verifyAndMark(body) {
  const matches = await query(
    `SELECT student_id AS studentId FROM fingerprints WHERE template_hash = :templateHash LIMIT 1`,
    { templateHash: body.templateHash }
  );

  if (!matches[0]) {
    const error = new Error("Fingerprint template did not match a registered student.");
    error.status = 404;
    throw error;
  }

  const studentId = matches[0].studentId;
  const sessions = await query(
    `SELECT
      cs.id AS classSessionId,
      cs.course_id AS courseId
    FROM class_sessions cs
    INNER JOIN student_courses sc ON sc.course_id = cs.course_id
    WHERE sc.student_id = :studentId
      AND cs.active = 1
      AND (:classSessionId IS NULL OR cs.id = :classSessionId)
    ORDER BY cs.start_time
    LIMIT 1`,
    { studentId, classSessionId: body.classSessionId ? Number(body.classSessionId) : null }
  );

  if (!sessions[0]) {
    const error = new Error("No active class session found for this student.");
    error.status = 404;
    throw error;
  }

  await attendanceModel.markAttendance({
    studentId,
    courseId: sessions[0].courseId,
    classSessionId: sessions[0].classSessionId,
    status: body.status || "present"
  });

  return { studentId, ...sessions[0] };
}

module.exports = { all, enroll, verifyAndMark };
