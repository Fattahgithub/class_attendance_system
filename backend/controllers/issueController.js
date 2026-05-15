const schoolModel = require("../models/schoolModel");

async function create(req, res, next) {
  try {
    await schoolModel.createIssue(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

module.exports = { create };
