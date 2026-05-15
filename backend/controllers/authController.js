const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const schoolModel = require("../models/schoolModel");

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const user = await userModel.findByEmail(email);
    const valid = user && user.role === role && await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials for selected role." });
    }

    req.session.regenerate(async error => {
      if (error) return next(error);
      req.session.user = safeUser(user);
      const data = await schoolModel.bootstrap();
      res.json({ user: req.session.user, data });
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    res.json({ user: req.session.user || null, data: await schoolModel.bootstrap() });
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
}

module.exports = { login, me, logout };
