const express = require("express");
const sessionController = require("../controllers/sessionController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), sessionController.create);
router.put("/:id", requireAuth, requireRole("admin"), sessionController.update);
router.delete("/:id", requireAuth, requireRole("admin"), sessionController.remove);

module.exports = router;
