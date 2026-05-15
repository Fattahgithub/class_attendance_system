const attendanceModel = require("../models/attendanceModel");
const { streamAttendancePdf } = require("../utils/pdf");

async function csv(req, res, next) {
  try {
    const rows = await attendanceModel.reportSummary(req.query.courseId);
    const header = ["student", "indexNo", "course", "present", "late", "absent", "rewardMarks"];
    const csvBody = [
      header.join(","),
      ...rows.map(row => header.map(key => JSON.stringify(row[key] ?? "")).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance-report.csv");
    res.send(csvBody);
  } catch (error) {
    next(error);
  }
}

async function pdf(req, res, next) {
  try {
    const rows = await attendanceModel.reportSummary(req.query.courseId);
    streamAttendancePdf(res, rows);
  } catch (error) {
    next(error);
  }
}

module.exports = { csv, pdf };
