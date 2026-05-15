const app = document.querySelector("#app");
let currentUser = null;
let data = {};
let activeTab = "overview";
const THEME_KEY = "cas-theme";

const demoUsers = {
  admin: ["admin@class.local", "admin123"],
  lecturer: ["lecturer@class.local", "lecturer123"],
  student: ["student@class.local", "student123"]
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const result = options.raw ? await response.text() : await response.json();
  if (!response.ok) throw new Error(result.message || "Request failed");
  return result;
};

const post = (url, body) => api(url, { method: "POST", body: JSON.stringify(body) });
const put = (url, body) => api(url, { method: "PUT", body: JSON.stringify(body) });
const remove = url => api(url, { method: "DELETE" });

function toast(message) {
  let node = document.querySelector(".toast");
  if (!node) {
    node = document.createElement("div");
    node.className = "toast";
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 2600);
}

function getTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.querySelectorAll(".theme-toggle").forEach(button => {
    button.querySelector(".theme-icon").textContent = theme === "dark" ? "D" : "L";
    button.querySelector(".theme-label").textContent = theme === "dark" ? "Dark" : "Light";
    button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  });
}

function bindThemeToggle() {
  setTheme(getTheme());
  document.querySelectorAll(".theme-toggle").forEach(button => {
    button.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  });
}

function optionList(items, label, value = "id") {
  return items.map(item => `<option value="${item[value]}">${label(item)}</option>`).join("");
}

function renderLogin() {
  app.innerHTML = document.querySelector("#login-template").innerHTML;
  const form = document.querySelector("#login-form");
  bindThemeToggle();

  document.querySelectorAll("[data-demo]").forEach(button => {
    button.addEventListener("click", () => {
      const role = button.dataset.demo;
      const [email, password] = demoUsers[role];
      form.role.value = role;
      form.email.value = email;
      form.password.value = password;
      document.querySelector("#login-note").textContent = `Ready: ${email} / ${password}`;
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await post("/api/login", body);
      currentUser = result.user;
      data = result.data;
      activeTab = "overview";
      renderDashboard();
      toast(`Welcome, ${currentUser.name}`);
    } catch (error) {
      toast(error.message);
    }
  });
}

function stats() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    ["Students", data.students.length],
    ["Lecturers", data.lecturers.length],
    ["Courses", data.courses.length],
    ["Today marked", data.attendanceRecords.filter(item => item.date === today).length]
  ];
}

function layout(title, tabs, body) {
  app.innerHTML = `
    <section class="app-shell">
      <header class="topbar">
        <div class="identity">
          ${dashboardAvatar()}
          <div>
            <strong>${currentUser.name}</strong>
            <p class="muted">${currentUser.role} dashboard</p>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="ghost-action" id="logout">Log out</button>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch theme">
            <span class="theme-icon">D</span>
            <span class="theme-label">Dark</span>
          </button>
        </div>
      </header>

      <div class="dashboard-title">
        <div>
          <p class="eyebrow">Class Attendance System</p>
          <h1>${title}</h1>
        </div>
        <div class="quick-actions">
          <button class="ghost-action" id="refresh">Refresh</button>
          <a class="ghost-action" href="/api/reports/csv">Export CSV</a>
          <a class="ghost-action" href="/api/reports/pdf">Export PDF</a>
        </div>
      </div>

      <div class="stats-grid">
        ${stats().map(([label, value]) => `<article class="stat"><span class="muted">${label}</span><strong>${value}</strong></article>`).join("")}
      </div>

      <div class="workspace">
        <nav class="sidebar">
          ${tabs.map(tab => `<button class="tab ${activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}">${tab.label}</button>`).join("")}
        </nav>
        <div class="content-stack">${body}</div>
      </div>
    </section>
  `;

  document.querySelector("#logout").addEventListener("click", async () => {
    await post("/api/logout", {});
    currentUser = null;
    renderLogin();
  });
  document.querySelector("#refresh").addEventListener("click", refresh);
  bindThemeToggle();
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderDashboard();
    });
  });
  bindEntityActions();
}

function panel(title, content, action = "") {
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>${title}</h2>
        ${action}
      </div>
      ${content}
    </section>
  `;
}

function renderDashboard() {
  if (currentUser.role === "admin") return renderAdmin();
  if (currentUser.role === "lecturer") return renderLecturer();
  renderStudent();
}

function dashboardAvatar() {
  if (currentUser?.role === "student") {
    const student = data.students?.find(item => item.id === currentUser.studentId);
    if (student?.profilePhoto) {
      return `<img class="avatar avatar-photo" src="${student.profilePhoto}" alt="${escapeHtml(student.name)} profile picture">`;
    }
  }

  return `<div class="avatar">${currentUser.name.slice(0, 2).toUpperCase()}</div>`;
}

function renderAdmin() {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "people", label: "People" },
    { id: "courses", label: "Courses" },
    { id: "sessions", label: "Class sessions" },
    { id: "fingerprints", label: "Fingerprints" },
    { id: "reports", label: "Reports" }
  ];
  const body = {
    overview: adminOverview,
    people: adminPeople,
    courses: adminCourses,
    sessions: adminSessions,
    fingerprints: fingerprintAdmin,
    reports: reportsPanel
  }[activeTab]();
  layout("Admin Command Center", tabs, body);
  bindForms();
}

function adminOverview() {
  return panel("Build Phases", `
    <div class="mini-grid">
      ${["Web system active", "MySQL schema ready", "Manual attendance", "Fingerprint phase next", "Reward marks live", "CSV reports"].map(text => `
        <article class="mini-card">
          <p class="eyebrow">Phase</p>
          <h3>${text}</h3>
          <p class="muted">Ready for the next build step.</p>
        </article>
      `).join("")}
    </div>
  `) + reportsPanel();
}

function adminPeople() {
  return panel("Register Student", `
    <form class="form-grid" data-action="/api/students">
      <label>Name<input name="name" required></label>
      <label>Index No<input name="indexNo" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Level<input name="level" value="100"></label>
      <label>Password<input name="password" value="student123"></label>
      <button class="primary-action">Save student</button>
    </form>
  `) + panel("Register Lecturer", `
    <form class="form-grid" data-action="/api/lecturers">
      <label>Name<input name="name" required></label>
      <label>Staff No<input name="staffNo" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Department<input name="department" value="Computer Science"></label>
      <label>Password<input name="password" value="lecturer123"></label>
      <button class="primary-action">Save lecturer</button>
    </form>
  `) + panel("People Directory", table(["Name", "Type", "Identifier", "Email", "Actions"], [
    ...data.students.map(item => [studentIdentity(item), "Student", item.indexNo, item.email, rowActions("student", item.id)]),
    ...data.lecturers.map(item => [item.name, "Lecturer", item.staffNo, item.email, rowActions("lecturer", item.id)])
  ]));
}

function adminCourses() {
  return panel("Add Course", `
    <form class="form-grid" data-action="/api/courses">
      <label>Code<input name="code" required></label>
      <label>Title<input name="title" required></label>
      <label>Credit<input name="credit" type="number" value="3"></label>
      <button class="primary-action">Create course</button>
    </form>
  `) + panel("Assign Student To Course", `
    <form class="form-grid" data-action="/api/courses/assign-student">
      <label>Student<select name="studentId">${optionList(data.students, item => `${item.indexNo} - ${item.name}`)}</select></label>
      <label>Course<select name="courseId">${optionList(data.courses, item => `${item.code} - ${item.title}`)}</select></label>
      <button class="primary-action">Assign student</button>
    </form>
  `) + panel("Assign Lecturer To Course", `
    <form class="form-grid" data-action="/api/courses/assign-lecturer">
      <label>Lecturer<select name="lecturerId">${optionList(data.lecturers, item => item.name)}</select></label>
      <label>Course<select name="courseId">${optionList(data.courses, item => `${item.code} - ${item.title}`)}</select></label>
      <button class="primary-action">Assign lecturer</button>
    </form>
  `) + panel("Courses", table(["Code", "Title", "Credit", "Actions"], data.courses.map(item => [
    item.code,
    item.title,
    item.credit,
    rowActions("course", item.id)
  ])));
}

function adminSessions() {
  return panel("Create Class Session", `
    <form class="form-grid" data-action="/api/sessions">
      <label>Title<input name="title" required></label>
      <label>Course<select name="courseId">${optionList(data.courses, item => `${item.code} - ${item.title}`)}</select></label>
      <label>Lecturer<select name="lecturerId">${optionList(data.lecturers, item => item.name)}</select></label>
      <label>Day<input name="day" value="Friday"></label>
      <label>Start<input name="startTime" type="time" value="09:00"></label>
      <label>End<input name="endTime" type="time" value="11:00"></label>
      <label>Room<input name="room" value="Lab A"></label>
      <label>Active<select name="active"><option value="true">Yes</option><option value="">No</option></select></label>
      <button class="primary-action">Create session</button>
    </form>
  `) + sessionsTable();
}

function renderLecturer() {
  const tabs = [
    { id: "overview", label: "Today" },
    { id: "mark", label: "Mark attendance" },
    { id: "scan", label: "Fingerprint scan" },
    { id: "students", label: "Class list" },
    { id: "reports", label: "Reports" }
  ];
  const body = {
    overview: lecturerToday,
    mark: markAttendance,
    scan: fingerprintScan,
    students: lecturerStudents,
    reports: reportsPanel
  }[activeTab]();
  layout("Lecturer Live Desk", tabs, body);
  bindForms();
}

function lecturerCourses() {
  const links = data.lecturerCourses.filter(item => item.lecturerId === currentUser.lecturerId).map(item => item.courseId);
  return data.courses.filter(course => links.includes(course.id));
}

function lecturerToday() {
  return sessionsTable(currentUser.lecturerId) + attendancePanel();
}

function markAttendance() {
  const courses = lecturerCourses();
  const sessions = data.classSessions.filter(item => item.lecturerId === currentUser.lecturerId);
  return panel("Mark Attendance Manually", `
    <form class="form-grid" data-action="/api/attendance/mark">
      <label>Student<select name="studentId">${optionList(data.students, item => `${item.indexNo} - ${item.name}`)}</select></label>
      <label>Course<select name="courseId">${optionList(courses, item => `${item.code} - ${item.title}`)}</select></label>
      <label>Class session<select name="classSessionId">${optionList(sessions, item => item.title)}</select></label>
      <label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label>Time in<input name="timeIn" type="time" value="${new Date().toTimeString().slice(0, 5)}"></label>
      <label>Status<select name="status"><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select></label>
      <button class="primary-action">Record attendance</button>
    </form>
  `) + attendancePanel();
}

function lecturerStudents() {
  const courseIds = lecturerCourses().map(item => item.id);
  const studentIds = data.studentCourses.filter(item => courseIds.includes(item.courseId)).map(item => item.studentId);
  const rows = data.students.filter(student => studentIds.includes(student.id)).map(student => [
    studentAvatar(student),
    student.indexNo,
    student.name,
    coursesForStudent(student.id).map(course => course.code).join(", ")
  ]);
  return panel("Students In Your Classes", table(["Photo", "Index", "Student", "Courses"], rows));
}

function fingerprintAdmin() {
  return panel("Enroll Fingerprint Template", `
    <form class="form-grid" data-action="/api/fingerprints/enroll">
      <label>Student<select name="studentId">${optionList(data.students, item => `${item.indexNo} - ${item.name}`)}</select></label>
      <label>Template hash<input name="templateHash" required placeholder="scanner-template-id"></label>
      <label>Scanner provider<input name="scannerProvider" value="Manual SDK bridge"></label>
      <button class="primary-action">Enroll template</button>
    </form>
  `) + panel("Enrolled Templates", table(["Student", "Index", "Provider", "Template"], (data.fingerprints || []).map(item => [
    item.student,
    item.indexNo,
    item.scannerProvider,
    item.templateHash
  ])));
}

function fingerprintScan() {
  const sessions = data.classSessions.filter(item => item.lecturerId === currentUser.lecturerId && item.active);
  return panel("Verify Fingerprint", `
    <form class="form-grid" data-action="/api/fingerprints/verify">
      <label>Template hash<input name="templateHash" required placeholder="scanner-template-id"></label>
      <label>Active class<select name="classSessionId"><option value="">Auto detect</option>${optionList(sessions, item => item.title)}</select></label>
      <label>Status<select name="status"><option value="present">Present</option><option value="late">Late</option></select></label>
      <button class="primary-action">Verify and mark</button>
    </form>
  `) + attendancePanel();
}

function renderStudent() {
  const tabs = [
    { id: "overview", label: "History" },
    { id: "rewards", label: "Rewards" },
    { id: "profile", label: "Profile" },
    { id: "issue", label: "Report issue" }
  ];
  const body = {
    overview: studentHistory,
    rewards: studentRewards,
    profile: studentProfile,
    issue: issueForm
  }[activeTab]();
  layout("Student Attendance Hub", tabs, body);
  bindForms();
  bindStudentProfileForms();
}

function currentStudent() {
  return data.students.find(student => student.id === currentUser.studentId);
}

function studentRecords() {
  return data.attendanceRecords.filter(item => item.studentId === currentUser.studentId);
}

function studentHistory() {
  return panel("Attendance History", table(["Date", "Course", "Session", "Time", "Status", "Mark"], studentRecords().map(record => [
    record.date,
    courseName(record.courseId),
    sessionName(record.classSessionId),
    record.timeIn,
    `<span class="status ${record.status}">${record.status}</span>`,
    record.rewardMark
  ])));
}

function studentRewards() {
  const marks = studentRecords().reduce((total, record) => total + Number(record.rewardMark), 0);
  return panel("Reward Marks", `
    <div class="mini-grid">
      <article class="mini-card"><p class="eyebrow">Total</p><h2>${marks}</h2><p class="muted">Present = 1, Late = 0.5, Absent = 0.</p></article>
      <article class="mini-card"><p class="eyebrow">Courses</p><h2>${coursesForStudent(currentUser.studentId).length}</h2><p class="muted">Assigned courses.</p></article>
      <article class="mini-card"><p class="eyebrow">Open issues</p><h2>${data.attendanceIssues.filter(item => item.studentId === currentUser.studentId && item.status === "open").length}</h2><p class="muted">Reported attendance concerns.</p></article>
    </div>
  `);
}

function studentProfile() {
  const student = currentStudent();
  return panel("My Profile", `
    <div class="profile-grid">
      <div class="profile-preview">
        ${studentAvatar(student, "large")}
        <div>
          <h3>${student.name}</h3>
          <p class="muted">${student.indexNo} - Level ${student.level || "N/A"}</p>
        </div>
      </div>
      <form class="form-grid two" data-profile-form="true" data-action="/api/students/${student.id}/profile">
        <label>Name<input name="name" value="${escapeHtml(student.name)}" required></label>
        <label>Profile picture<input name="profilePhotoFile" type="file" accept="image/png,image/jpeg,image/webp"></label>
        <button class="primary-action">Update profile</button>
      </form>
    </div>
  `) + panel("Reset Password", `
    <form class="form-grid two" data-password-form="true" data-action="/api/students/${student.id}/password">
      <label>Current password<input name="currentPassword" type="password" required></label>
      <label>New password<input name="newPassword" type="password" minlength="6" required></label>
      <button class="primary-action">Reset password</button>
    </form>
  `);
}

function issueForm() {
  const student = currentStudent();
  return panel("Report Missing Attendance", `
    <form class="form-grid two" data-action="/api/issues">
      <input type="hidden" name="studentId" value="${student.id}">
      <label>Course<select name="courseId">${optionList(coursesForStudent(student.id), item => `${item.code} - ${item.title}`)}</select></label>
      <label>Message<textarea name="message" required placeholder="Describe the class and what went wrong"></textarea></label>
      <button class="primary-action">Submit issue</button>
    </form>
  `) + panel("My Issues", table(["Course", "Message", "Status"], data.attendanceIssues.filter(item => item.studentId === student.id).map(item => [
    courseName(item.courseId),
    item.message,
    item.status
  ])));
}

function reportsPanel() {
  const rows = reportRows();
  return panel("Attendance Reports", table(["Student", "Index", "Course", "Present", "Late", "Absent", "Marks"], rows.map(item => [
    item.student,
    item.indexNo,
    item.course,
    item.present,
    item.late,
    item.absent,
    item.rewardMarks
  ])), `<div class="row-actions"><a class="primary-action" href="/api/reports/csv">Download CSV</a><a class="primary-action" href="/api/reports/pdf">Download PDF</a></div>`);
}

function reportRows() {
  const grouped = {};
  for (const record of data.attendanceRecords) {
    const student = data.students.find(item => item.id === record.studentId) || {};
    const course = data.courses.find(item => item.id === record.courseId) || {};
    const key = `${record.studentId}-${record.courseId}`;
    grouped[key] ||= { student: student.name, indexNo: student.indexNo, course: course.code, present: 0, late: 0, absent: 0, rewardMarks: 0 };
    grouped[key][record.status] += 1;
    grouped[key].rewardMarks += Number(record.rewardMark);
  }
  return Object.values(grouped);
}

function attendancePanel() {
  return panel("Live Attendance", table(["Date", "Student", "Course", "Time", "Status", "Mark"], data.attendanceRecords.map(record => [
    record.date,
    studentName(record.studentId),
    courseName(record.courseId),
    record.timeIn,
    `<span class="status ${record.status}">${record.status}</span>`,
    record.rewardMark
  ])));
}

function sessionsTable(lecturerId) {
  const rows = data.classSessions
    .filter(item => !lecturerId || item.lecturerId === lecturerId)
    .map(item => [
      item.title,
      courseName(item.courseId),
      lecturerName(item.lecturerId),
      item.day,
      `${item.startTime} - ${item.endTime}`,
      item.room,
      item.active ? "Active" : "Planned",
      currentUser.role === "admin" ? rowActions("session", item.id) : ""
    ]);
  return panel("Class Sessions", table(["Title", "Course", "Lecturer", "Day", "Time", "Room", "State", "Actions"], rows));
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">No records yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function bindForms() {
  document.querySelectorAll("form[data-action]").forEach(form => {
    if (form.dataset.profileForm || form.dataset.passwordForm) return;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      try {
        const result = await post(form.dataset.action, body);
        data = result.data ? result.data : result;
        await refresh(false);
        toast("Saved");
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function bindStudentProfileForms() {
  document.querySelectorAll("[data-profile-form]").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const file = form.profilePhotoFile.files[0];
        const body = { name: form.name.value.trim() };
        if (file) body.profilePhoto = await fileToDataUrl(file);
        const result = await put(form.dataset.action, body);
        currentUser = result.user || currentUser;
        data = result.data || data;
        renderDashboard();
        toast("Profile updated");
      } catch (error) {
        toast(error.message);
      }
    });
  });

  document.querySelectorAll("[data-password-form]").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await put(form.dataset.action, Object.fromEntries(new FormData(form).entries()));
        form.reset();
        toast("Password changed");
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function rowActions(type, id) {
  return `
    <div class="row-actions">
      <button class="ghost-action" data-edit="${type}" data-id="${id}" type="button">Edit</button>
      <button class="danger-action" data-delete="${type}" data-id="${id}" type="button">Delete</button>
    </div>
  `;
}

function bindEntityActions() {
  document.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => editEntity(button.dataset.edit, Number(button.dataset.id)));
  });
  document.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteEntity(button.dataset.delete, Number(button.dataset.id)));
  });
}

async function editEntity(type, id) {
  const collections = {
    student: data.students,
    lecturer: data.lecturers,
    course: data.courses,
    session: data.classSessions
  };
  const item = collections[type].find(entry => entry.id === id);
  if (!item) return toast("Record not found");

  const updated = { ...item };
  if (type === "student") {
    updated.name = prompt("Student name", item.name) || item.name;
    updated.indexNo = prompt("Index number", item.indexNo) || item.indexNo;
    updated.email = prompt("Email", item.email) || item.email;
    updated.level = prompt("Level", item.level) || item.level;
    data = await put(`/api/students/${id}`, updated);
  }
  if (type === "lecturer") {
    updated.name = prompt("Lecturer name", item.name) || item.name;
    updated.staffNo = prompt("Staff number", item.staffNo) || item.staffNo;
    updated.email = prompt("Email", item.email) || item.email;
    updated.department = prompt("Department", item.department) || item.department;
    data = await put(`/api/lecturers/${id}`, updated);
  }
  if (type === "course") {
    updated.code = prompt("Course code", item.code) || item.code;
    updated.title = prompt("Course title", item.title) || item.title;
    updated.credit = prompt("Credit", item.credit) || item.credit;
    data = await put(`/api/courses/${id}`, updated);
  }
  if (type === "session") {
    updated.title = prompt("Session title", item.title) || item.title;
    updated.day = prompt("Day", item.day) || item.day;
    updated.startTime = prompt("Start time", item.startTime) || item.startTime;
    updated.endTime = prompt("End time", item.endTime) || item.endTime;
    updated.room = prompt("Room", item.room) || item.room;
    updated.active = confirm("Should this session be active?");
    data = await put(`/api/sessions/${id}`, updated);
  }
  renderDashboard();
  toast("Updated");
}

async function deleteEntity(type, id) {
  if (!confirm(`Delete this ${type}?`)) return;
  const endpoints = {
    student: `/api/students/${id}`,
    lecturer: `/api/lecturers/${id}`,
    course: `/api/courses/${id}`,
    session: `/api/sessions/${id}`
  };
  data = await remove(endpoints[type]);
  renderDashboard();
  toast("Deleted");
}

async function refresh(showToast = true) {
  data = await api("/api/bootstrap");
  renderDashboard();
  if (showToast) toast("Dashboard refreshed");
}

function studentName(id) {
  return data.students.find(item => item.id === Number(id))?.name || "Unknown";
}

function studentAvatar(student, size = "") {
  const initial = (student?.name || "?").slice(0, 1).toUpperCase();
  const className = `student-avatar ${size === "large" ? "large" : ""}`.trim();
  if (student?.profilePhoto) {
    return `<img class="${className}" src="${student.profilePhoto}" alt="${escapeHtml(student.name)} profile picture">`;
  }
  return `<span class="${className}" aria-hidden="true">${initial}</span>`;
}

function studentIdentity(student) {
  return `<div class="student-identity">${studentAvatar(student)}<span>${escapeHtml(student.name)}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function lecturerName(id) {
  return data.lecturers.find(item => item.id === Number(id))?.name || "Unknown";
}

function courseName(id) {
  const course = data.courses.find(item => item.id === Number(id));
  return course ? `${course.code} ${course.title}` : "Unknown";
}

function sessionName(id) {
  return data.classSessions.find(item => item.id === Number(id))?.title || "Class session";
}

function coursesForStudent(studentId) {
  const ids = data.studentCourses.filter(item => item.studentId === Number(studentId)).map(item => item.courseId);
  return data.courses.filter(course => ids.includes(course.id));
}

renderLogin();
