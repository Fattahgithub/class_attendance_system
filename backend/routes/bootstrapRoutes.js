const express = require("express");
const schoolModel = require("../models/schoolModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
