const express = require("express");
const courseController = require("../controllers/courseController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), courseController.create);
router.put("/:id", requireAuth, requireRole("admin"), courseController.update);
router.delete("/:id", requireAuth, requireRole("admin"), courseController.remove);
router.post("/assign-student", requireAuth, requireRole("admin"), courseController.assignStudent);
router.post("/assign-lecturer", requireAuth, requireRole("admin"), courseController.assignLecturer);

module.exports = router;
