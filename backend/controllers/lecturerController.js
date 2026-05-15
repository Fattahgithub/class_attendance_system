const bcrypt = require("bcryptjs");
const schoolModel = require("../models/schoolModel");
const userModel = require("../models/userModel");

async function create(req, res, next) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password || "lecturer123", 12);
    await userModel.createPerson({
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: "lecturer",
      profile: { staffNo: req.body.staffNo, department: req.body.department }
    });
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await schoolModel.updateLecturer(Number(req.params.id), req.body);
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await schoolModel.deleteLecturer(Number(req.params.id));
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

module.exports = { create, update, remove };
