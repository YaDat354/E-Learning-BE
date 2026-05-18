require('dotenv').config();

const { query } = require('../config/database');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const KEEP_BULK_TEACHERS = toPositiveInt(process.env.SEED_BULK_TEACHERS, 5);
const KEEP_BULK_STUDENTS = toPositiveInt(process.env.SEED_BULK_STUDENTS, 40);

const BASE_KEEP_EMAILS = [
  'teacher.seed1@gmail.com',
  'teacher.seed2@gmail.com',
  'student.seed1@gmail.com',
  'student.seed2@gmail.com',
  'admin.seed1@gmail.com',
];

const hasColumn = async (tableName, columnName) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS ok`,
    [tableName, columnName]
  );

  return result.rows[0]?.ok === true;
};

const hasTable = async (tableName) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS ok`,
    [tableName]
  );

  return result.rows[0]?.ok === true;
};

const cleanupCourseDependencies = async (courseIds) => {
  if (!courseIds.length) return;

  const assignmentHasCourseId = await hasColumn('assignments', 'course_id');
  const assignmentHasLessonId = await hasColumn('assignments', 'lesson_id');
  const quizHasCourseId = await hasColumn('quizzes', 'course_id');
  const quizHasLessonId = await hasColumn('quizzes', 'lesson_id');
  const hasFilesTable = await hasTable('files');

  await query('DELETE FROM discussions WHERE course_id = ANY($1::uuid[])', [courseIds]);
  await query('DELETE FROM enrollments WHERE course_id = ANY($1::uuid[])', [courseIds]);

  const lessonRows = await query('SELECT id FROM lessons WHERE course_id = ANY($1::uuid[])', [courseIds]);
  const lessonIds = lessonRows.rows.map((row) => row.id);

  let quizIds = [];
  if (quizHasCourseId) {
    const rows = await query('SELECT id FROM quizzes WHERE course_id = ANY($1::uuid[])', [courseIds]);
    quizIds = [...quizIds, ...rows.rows.map((row) => row.id)];
  }
  if (quizHasLessonId && lessonIds.length) {
    const rows = await query('SELECT id FROM quizzes WHERE lesson_id = ANY($1::uuid[])', [lessonIds]);
    quizIds = [...quizIds, ...rows.rows.map((row) => row.id)];
  }
  quizIds = [...new Set(quizIds)];

  if (quizIds.length) {
    await query(
      `DELETE FROM student_answers
       WHERE quiz_result_id IN (SELECT id FROM quiz_results WHERE quiz_id = ANY($1::uuid[]))`,
      [quizIds]
    );
    await query('DELETE FROM quiz_results WHERE quiz_id = ANY($1::uuid[])', [quizIds]);
    await query(
      'DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ANY($1::uuid[]))',
      [quizIds]
    );
    await query('DELETE FROM questions WHERE quiz_id = ANY($1::uuid[])', [quizIds]);
    await query('DELETE FROM quizzes WHERE id = ANY($1::uuid[])', [quizIds]);
  }

  let assignmentIds = [];
  if (assignmentHasCourseId) {
    const rows = await query('SELECT id FROM assignments WHERE course_id = ANY($1::uuid[])', [courseIds]);
    assignmentIds = [...assignmentIds, ...rows.rows.map((row) => row.id)];
  }
  if (assignmentHasLessonId && lessonIds.length) {
    const rows = await query('SELECT id FROM assignments WHERE lesson_id = ANY($1::uuid[])', [lessonIds]);
    assignmentIds = [...assignmentIds, ...rows.rows.map((row) => row.id)];
  }
  assignmentIds = [...new Set(assignmentIds)];

  if (assignmentIds.length) {
    await query('DELETE FROM submissions WHERE assignment_id = ANY($1::uuid[])', [assignmentIds]);
    await query('DELETE FROM assignments WHERE id = ANY($1::uuid[])', [assignmentIds]);
  }

  if (lessonIds.length) {
    await query('DELETE FROM lesson_files WHERE lesson_id = ANY($1::uuid[])', [lessonIds]);
    if (hasFilesTable) {
      await query('DELETE FROM files WHERE lesson_id = ANY($1::uuid[])', [lessonIds]);
    }
    await query('DELETE FROM learning_logs WHERE lesson_id = ANY($1::uuid[])', [lessonIds]);
    await query('DELETE FROM lessons WHERE id = ANY($1::uuid[])', [lessonIds]);
  }

  await query('DELETE FROM courses WHERE id = ANY($1::uuid[])', [courseIds]);
};

const cleanupUserDependencies = async (userIds) => {
  if (!userIds.length) return;

  const enrollmentsHasStudentId = await hasColumn('enrollments', 'student_id');
  const enrollmentsHasUserId = await hasColumn('enrollments', 'user_id');

  if (enrollmentsHasStudentId) {
    await query('DELETE FROM enrollments WHERE student_id = ANY($1::uuid[])', [userIds]);
  }
  if (enrollmentsHasUserId) {
    await query('DELETE FROM enrollments WHERE user_id = ANY($1::uuid[])', [userIds]);
  }

  await query('DELETE FROM submissions WHERE student_id = ANY($1::uuid[])', [userIds]);
  await query(
    `DELETE FROM student_answers
     WHERE quiz_result_id IN (
       SELECT id FROM quiz_results WHERE student_id = ANY($1::uuid[])
     )`,
    [userIds]
  );
  await query('DELETE FROM quiz_results WHERE student_id = ANY($1::uuid[])', [userIds]);
  await query('DELETE FROM learning_logs WHERE student_id = ANY($1::uuid[])', [userIds]);
  await query('DELETE FROM notifications WHERE user_id = ANY($1::uuid[])', [userIds]);
  await query('DELETE FROM discussions WHERE user_id = ANY($1::uuid[])', [userIds]);
};

const run = async () => {
  // Remove courses owned by teacher.bulk users above KEEP_BULK_TEACHERS.
  const teacherResult = await query(
    `SELECT id
     FROM users
     WHERE email LIKE 'teacher.bulk%@gmail.com'
       AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) > $1`,
    [KEEP_BULK_TEACHERS]
  );

  const teacherIds = teacherResult.rows.map((r) => r.id);

  if (teacherIds.length > 0) {
    const courses = await query('SELECT id FROM courses WHERE teacher_id = ANY($1::uuid[])', [teacherIds]);
    const courseIds = courses.rows.map((row) => row.id);
    await cleanupCourseDependencies(courseIds);
  }

  // Remove extra teacher.bulk users.
  await cleanupUserDependencies(teacherIds);
  await query(
    `DELETE FROM users
     WHERE email LIKE 'teacher.bulk%@gmail.com'
       AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) > $1`,
    [KEEP_BULK_TEACHERS]
  );

  // Remove extra student.bulk users.
  const extraStudentsResult = await query(
    `SELECT id
     FROM users
     WHERE email LIKE 'student.bulk%@gmail.com'
       AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) > $1`,
    [KEEP_BULK_STUDENTS]
  );

  await cleanupUserDependencies(extraStudentsResult.rows.map((row) => row.id));

  await query(
    `DELETE FROM users
     WHERE email LIKE 'student.bulk%@gmail.com'
       AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) > $1`,
    [KEEP_BULK_STUDENTS]
  );

  // Remove any non-whitelisted users from previous smoke/import runs.
  const otherUsers = await query(
    `SELECT id
     FROM users
     WHERE NOT (
       email = ANY($1::text[])
       OR (
         email LIKE 'teacher.bulk%@gmail.com'
         AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) <= $2
       )
       OR (
         email LIKE 'student.bulk%@gmail.com'
         AND CAST(regexp_replace(split_part(email, '@', 1), '\\D', '', 'g') AS INT) <= $3
       )
     )`,
    [BASE_KEEP_EMAILS, KEEP_BULK_TEACHERS, KEEP_BULK_STUDENTS]
  );

  const otherUserIds = otherUsers.rows.map((row) => row.id);

  if (otherUserIds.length) {
    const ownedCourses = await query(
      'SELECT id FROM courses WHERE teacher_id = ANY($1::uuid[])',
      [otherUserIds]
    );
    const ownedCourseIds = ownedCourses.rows.map((row) => row.id);
    await cleanupCourseDependencies(ownedCourseIds);
  }

  await cleanupUserDependencies(otherUserIds);
  if (otherUserIds.length) {
    await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [otherUserIds]);
  }

  const counts = await query(
    `SELECT
       COUNT(*)::int AS total_users,
       COUNT(*) FILTER (WHERE email LIKE 'teacher.bulk%@gmail.com')::int AS teacher_bulk,
       COUNT(*) FILTER (WHERE email LIKE 'student.bulk%@gmail.com')::int AS student_bulk,
       COUNT(*) FILTER (WHERE email IN (
         'teacher.seed1@gmail.com',
         'teacher.seed2@gmail.com',
         'student.seed1@gmail.com',
         'student.seed2@gmail.com',
         'admin.seed1@gmail.com'
       ))::int AS base_seed
     FROM users`
  );

  console.log('TRIM_DONE', counts.rows[0]);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
