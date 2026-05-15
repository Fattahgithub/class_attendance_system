const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, attendanceController.list);
router.post("/mark", requireAuth, requireRole("lecturer", "admin"), attendanceController.mark);

module.exports = router;
