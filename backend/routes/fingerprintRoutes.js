const express = require("express");
const fingerprintController = require("../controllers/fingerprintController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/enroll", requireAuth, requireRole("admin"), fingerprintController.enroll);
router.post("/verify", requireAuth, requireRole("lecturer", "admin"), fingerprintController.verify);

module.exports = router;
