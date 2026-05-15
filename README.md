# Class Attendance System

MySQL-backed class attendance system built from `Build it in phases.docx`.

## Setup

1. Copy `.env.example` to `.env`.
2. Update the MySQL credentials in `.env`.
3. Start MySQL.
4. Install dependencies:

```bash
npm install
```

5. Create the database and tables:

```bash
npm run db:init
```

6. Seed demo users and records:

```bash
npm run db:seed
```

7. Apply any later table changes:

```bash
npm run db:migrate
```

8. Start the app:

```bash
npm start
```

Open `http://localhost:5000`.

## Demo Logins

- Admin: `admin@class.local` / `BISMILLAH@admin123`
- Lecturer: `lecturer@class.local` / `lecturer123`
- Student: `student@class.local` / `student123`

## What Is Built

- Express backend with routes, controllers, models, and MySQL config.
- MySQL schema in `database/schema.sql`.
- Password hashing with `bcryptjs`.
- Safer cookie sessions with `express-session`.
- Admin create/edit/delete for students, lecturers, courses, and class sessions.
- Course assignment for students and lecturers.
- Lecturer attendance marking.
- Student attendance history, reward marks, and missing attendance issue reporting.
- Student profile editing, password reset, and profile picture upload.
- CSV and PDF attendance report exports.
- Fingerprint-ready flow:
  - Admin enrolls a fingerprint template hash for a student.
  - Lecturer verifies a template hash.
  - The system finds the matching student and active class, then records attendance.

## Current Local Note

The code is ready, but this machine did not have MySQL accepting connections on `localhost:3306` during setup. Start MySQL and set `.env`, then run `npm run db:init` and `npm run db:seed`.
