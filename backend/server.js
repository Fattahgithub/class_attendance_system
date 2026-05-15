const path = require("path");
const express = require("express");
const session = require("express-session");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const bootstrapRoutes = require("./routes/bootstrapRoutes");
const studentRoutes = require("./routes/studentRoutes");
const lecturerRoutes = require("./routes/lecturerRoutes");
const courseRoutes = require("./routes/courseRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const issueRoutes = require("./routes/issueRoutes");
const fingerprintRoutes = require("./routes/fingerprintRoutes");

const app = express();
const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.use(express.json({ limit: "8mb" }));
app.use(session({
  name: "cas.sid",
  secret: process.env.SESSION_SECRET || "dev-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static(PUBLIC_DIR));

app.use("/api", authRoutes);
app.use("/api/bootstrap", bootstrapRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/fingerprints", fingerprintRoutes);

app.get("/api/reports.csv", (req, res) => res.redirect(302, "/api/reports/csv"));
app.get("/api/reports.pdf", (req, res) => res.redirect(302, "/api/reports/pdf"));

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  const message = error.code === "ECONNREFUSED"
    ? "MySQL is not running or is not reachable. Start MySQL and check DB_HOST/DB_PORT in .env."
    : error.code === "ER_NO_SUCH_TABLE"
    ? "Database is not initialized. Run npm run db:init and npm run db:seed."
    : error.message || "Server error.";
  res.status(error.status || 500).json({ message });
});

module.exports = app;
