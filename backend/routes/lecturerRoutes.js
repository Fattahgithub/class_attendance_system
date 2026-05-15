const express = require("express");
const lecturerController = require("../controllers/lecturerController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), lecturerController.create);
router.put("/:id", requireAuth, requireRole("admin"), lecturerController.update);
router.delete("/:id", requireAuth, requireRole("admin"), lecturerController.remove);

module.exports = router;
