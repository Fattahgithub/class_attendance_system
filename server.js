const app = require("./backend/server");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Class Attendance System running at http://localhost:${PORT}`);
});
