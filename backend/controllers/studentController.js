const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const schoolModel = require("../models/schoolModel");
const userModel = require("../models/userModel");

const PROFILE_UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads", "profiles");
const ALLOWED_PROFILE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

async function saveProfilePhoto(studentId, dataUrl) {
  if (!dataUrl) return null;

  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const error = new Error("Profile picture must be a JPEG, PNG, or WebP image.");
    error.status = 400;
    throw error;
  }

  const mimeType = match[1];
  const extension = ALLOWED_PROFILE_TYPES[mimeType];
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length > 2 * 1024 * 1024) {
    const error = new Error("Please choose an image smaller than 2 MB.");
    error.status = 400;
    throw error;
  }

  await fs.mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
  const filename = `student-${studentId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
  await fs.writeFile(path.join(PROFILE_UPLOAD_DIR, filename), buffer);
  return `/uploads/profiles/${filename}`;
}

async function create(req, res, next) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password || "student123", 12);
    await userModel.createPerson({
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: "student",
      profile: { indexNo: req.body.indexNo, level: req.body.level }
    });
    res.status(201).json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await schoolModel.updateStudent(Number(req.params.id), req.body);
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await schoolModel.deleteStudent(Number(req.params.id));
    res.json(await schoolModel.bootstrap());
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    if (req.session.user.role !== "student" || Number(req.session.user.studentId) !== Number(req.params.id)) {
      return res.status(403).json({ message: "You can only update your own student profile." });
    }

    const studentId = Number(req.params.id);
    const profilePhoto = await saveProfilePhoto(studentId, req.body.profilePhoto);

    await schoolModel.updateStudentProfile(studentId, {
      name: req.body.name,
      profilePhoto
    });
    req.session.user.name = req.body.name || req.session.user.name;
    res.json({ user: req.session.user, data: await schoolModel.bootstrap() });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    if (req.session.user.role !== "student" || Number(req.session.user.studentId) !== Number(req.params.id)) {
      return res.status(403).json({ message: "You can only change your own password." });
    }

    const user = await userModel.findByEmail(req.session.user.email);
    const valid = user && await bcrypt.compare(req.body.currentPassword || "", user.passwordHash);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    if (!req.body.newPassword || req.body.newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    await schoolModel.changeStudentPassword(Number(req.params.id), passwordHash);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, update, remove, updateProfile, changePassword };
