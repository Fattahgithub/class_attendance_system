const express = require("express");
const issueController = require("../controllers/issueController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("student", "admin"), issueController.create);

module.exports = router;
