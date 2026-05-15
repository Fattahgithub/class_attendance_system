const attendanceModel = require("../models/attendanceModel");
const schoolModel = require("../models/schoolModel");

async function mark(req, res, next) {
  try {
    await attendanceModel.markAttendance(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    res.json({
      attendance: await attendanceModel.allRecords(),
      reports: await attendanceModel.reportSummary(req.query.courseId)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { mark, list };
