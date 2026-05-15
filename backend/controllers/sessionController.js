const schoolModel = require("../models/schoolModel");

async function create(req, res, next) {
  try {
    await schoolModel.createSession(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await schoolModel.updateSession(Number(req.params.id), req.body);
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await schoolModel.deleteSession(Number(req.params.id));
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

module.exports = { create, update, remove };
