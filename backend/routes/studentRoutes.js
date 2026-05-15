const express = require("express");
const studentController = require("../controllers/studentController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("admin"), studentController.create);
router.put("/:id/profile", requireAuth, requireRole("student"), studentController.updateProfile);
router.put("/:id/password", requireAuth, requireRole("student"), studentController.changePassword);
router.put("/:id", requireAuth, requireRole("admin"), studentController.update);
router.delete("/:id", requireAuth, requireRole("admin"), studentController.remove);

module.exports = router;
