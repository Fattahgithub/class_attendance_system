const fingerprintModel = require("../models/fingerprintModel");
const schoolModel = require("../models/schoolModel");

async function enroll(req, res, next) {
  try {
    await fingerprintModel.enroll(req.body);
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function verify(req, res, next) {
  try {
    const match = await fingerprintModel.verifyAndMark(req.body);
    res.status(201).json({ match, data: await schoolModel.bootstrap() });
  } catch (error) {
    next(error);
  }
}

module.exports = { enroll, verify };
