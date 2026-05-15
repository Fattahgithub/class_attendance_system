const { query } = require("../config/db");
const { rewardFor } = require("../utils/rewards");

async function allRecords() {
  return query(
    `SELECT
      id,
      student_id AS studentId,
      course_id AS courseId,
      class_session_id AS classSessionId,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      TIME_FORMAT(time_in, '%H:%i') AS timeIn,
      status,
      CAST(reward_mark AS DECIMAL(6,2)) AS rewardMark,
      created_at AS createdAt
    FROM attendance_records
    ORDER BY date DESC, time_in DESC`
  );
}

async function markAttendance(body) {
  const status = body.status || "present";
  const rewardMark = rewardFor(status);
  const date = body.date || new Date().toISOString().slice(0, 10);
  const timeIn = body.timeIn || new Date().toTimeString().slice(0, 5);

  await query(
    `INSERT INTO attendance_records
      (student_id, course_id, class_session_id, date, time_in, status, reward_mark)
    VALUES
      (:studentId, :courseId, :classSessionId, :date, :timeIn, :status, :rewardMark)
    ON DUPLICATE KEY UPDATE
      course_id = VALUES(course_id),
      time_in = VALUES(time_in),
      status = VALUES(status),
      reward_mark = VALUES(reward_mark)`,
    {
      studentId: Number(body.studentId),
      courseId: Number(body.courseId),
      classSessionId: Number(body.classSessionId),
      date,
      timeIn,
      status,
      rewardMark
    }
  );
}

async function reportSummary(courseId) {
  return query(
    `SELECT
      u.name AS student,
      s.index_no AS indexNo,
      c.code AS course,
      SUM(ar.status = 'present') AS present,
      SUM(ar.status = 'late') AS late,
      SUM(ar.status = 'absent') AS absent,
      CAST(SUM(ar.reward_mark) AS DECIMAL(8,2)) AS rewardMarks
    FROM attendance_records ar
    INNER JOIN students s ON s.id = ar.student_id
    INNER JOIN users u ON u.id = s.user_id
    INNER JOIN courses c ON c.id = ar.course_id
    WHERE (:courseId IS NULL OR ar.course_id = :courseId)
    GROUP BY ar.student_id, ar.course_id
    ORDER BY c.code, u.name`,
    { courseId: courseId ? Number(courseId) : null }
  );
}

module.exports = {
  allRecords,
  markAttendance,
  reportSummary
};
