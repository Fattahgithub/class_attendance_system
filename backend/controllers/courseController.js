const schoolModel = require("../models/schoolModel");

async function create(req, res, next) {
  try {
    await schoolModel.createCourse(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await schoolModel.updateCourse(Number(req.params.id), req.body);
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await schoolModel.deleteCourse(Number(req.params.id));
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function assignStudent(req, res, next) {
  try {
    await schoolModel.assignStudent(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function assignLecturer(req, res, next) {
  try {
    await schoolModel.assignLecturer(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

module.exports = { create, update, remove, assignStudent, assignLecturer };
