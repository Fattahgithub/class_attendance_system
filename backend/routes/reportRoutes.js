const express = require("express");
const reportController = require("../controllers/reportController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/csv", requireAuth, reportController.csv);
router.get("/pdf", requireAuth, reportController.pdf);

module.exports = router;
