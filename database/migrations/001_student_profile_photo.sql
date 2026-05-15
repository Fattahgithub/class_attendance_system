USE class_attendance_system;

ALTER TABLE students
  ADD COLUMN profile_photo LONGTEXT NULL AFTER level;
