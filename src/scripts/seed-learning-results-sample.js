require('dotenv').config();

const { query, pool } = require('../config/database');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const STUDENT_LIMIT = toPositiveInt(process.env.SEED_RESULTS_STUDENT_LIMIT, 60);
const SUBMISSION_LIMIT = toPositiveInt(process.env.SEED_RESULTS_SUBMISSION_LIMIT, 250);
const QUIZ_RESULT_LIMIT = toPositiveInt(process.env.SEED_RESULTS_QUIZ_LIMIT, 300);
const STUDENT_EMAIL_DOMAIN = (process.env.SEED_RESULTS_STUDENT_EMAIL_DOMAIN || '').trim();

const hasColumn = async (tableName, columnName) => {
  const result = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS ok
    `,
    [tableName, columnName]
  );

  return result.rows[0]?.ok === true;
};

const getTargetStudentIds = async () => {
  const roleColumnExists = await hasColumn('users', 'role');

  if (roleColumnExists) {
    if (STUDENT_EMAIL_DOMAIN) {
      const result = await query(
        `
          SELECT id
          FROM users
          WHERE role = 'student'
            AND email ILIKE $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [`%@${STUDENT_EMAIL_DOMAIN}`, STUDENT_LIMIT]
      );

      return result.rows.map((row) => row.id);
    }

    const result = await query(
      `
        SELECT id
        FROM users
        WHERE role = 'student'
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [STUDENT_LIMIT]
    );

    return result.rows.map((row) => row.id);
  }

  if (STUDENT_EMAIL_DOMAIN) {
    const result = await query(
      `
        SELECT u.id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'student'
          AND u.email ILIKE $1
        ORDER BY u.created_at DESC
        LIMIT $2
      `,
      [`%@${STUDENT_EMAIL_DOMAIN}`, STUDENT_LIMIT]
    );

    return result.rows.map((row) => row.id);
  }

  const result = await query(
    `
      SELECT u.id
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'student'
      ORDER BY u.created_at DESC
      LIMIT $1
    `,
    [STUDENT_LIMIT]
  );

  return result.rows.map((row) => row.id);
};

const createAssignments = async () => {
  const lessonIdSupported = await hasColumn('assignments', 'lesson_id');

  const candidates = await query(
    `
      SELECT c.id AS course_id, c.title AS course_title, l1.lesson_id
      FROM courses c
      LEFT JOIN LATERAL (
        SELECT l.id AS lesson_id
        FROM lessons l
        WHERE l.course_id = c.id
        ORDER BY l.order_index ASC, l.created_at ASC
        LIMIT 1
      ) l1 ON TRUE
      ORDER BY c.created_at DESC
      LIMIT 5
    `
  );

  let created = 0;

  for (const row of candidates.rows) {
    if (lessonIdSupported && !row.lesson_id) {
      continue;
    }

    const existing = await query(
      `
        SELECT id
        FROM assignments
        WHERE course_id = $1
        LIMIT 1
      `,
      [row.course_id]
    );

    if (existing.rows[0]) {
      continue;
    }

    if (lessonIdSupported) {
      await query(
        `
          INSERT INTO assignments (course_id, lesson_id, title, description, due_date, max_score)
          VALUES ($1, $2, $3, $4, NOW() + INTERVAL '14 days', 100)
        `,
        [
          row.course_id,
          row.lesson_id,
          `Sample Assignment - ${row.course_title}`,
          'Generated sample assignment for learning results display.',
        ]
      );
    } else {
      await query(
        `
          INSERT INTO assignments (course_id, title, description, due_date, max_score)
          VALUES ($1, $2, $3, NOW() + INTERVAL '14 days', 100)
        `,
        [
          row.course_id,
          `Sample Assignment - ${row.course_title}`,
          'Generated sample assignment for learning results display.',
        ]
      );
    }

    created += 1;
    if (created >= 3) {
      break;
    }
  }

  return created;
};

const createSampleSubmissions = async (studentIds) => {
  if (!studentIds.length) {
    return 0;
  }

  const result = await query(
    `
      SELECT a.id AS assignment_id, e.student_id
      FROM assignments a
      JOIN enrollments e ON e.course_id = a.course_id
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
      WHERE s.id IS NULL
        AND e.student_id = ANY($1::uuid[])
      ORDER BY a.created_at DESC, e.enrolled_at DESC
      LIMIT $2
    `,
    [studentIds, SUBMISSION_LIMIT]
  );

  let created = 0;

  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows[i];
    const score = 70 + (i % 4) * 5;

    await query(
      `
        INSERT INTO submissions (assignment_id, student_id, content, file_url, score, feedback, submitted_at, graded_at)
        VALUES ($1, $2, $3, NULL, $4, $5, NOW() - ($6::int * INTERVAL '1 day'), NOW())
      `,
      [
        row.assignment_id,
        row.student_id,
        'Sample submission content for FE learning results.',
        score,
        'Sample graded feedback generated for testing dashboard UI.',
        i,
      ]
    );

    created += 1;
  }

  return created;
};

const createSampleQuizResults = async (studentIds) => {
  if (!studentIds.length) {
    return 0;
  }

  const result = await query(
    `
      SELECT q.id AS quiz_id, e.student_id
      FROM quizzes q
      JOIN enrollments e ON e.course_id = q.course_id
      LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = e.student_id
      WHERE qr.id IS NULL
        AND e.student_id = ANY($1::uuid[])
      ORDER BY q.created_at DESC, e.enrolled_at DESC
      LIMIT $2
    `,
    [studentIds, QUIZ_RESULT_LIMIT]
  );

  let created = 0;

  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows[i];
    const score = 65 + (i % 5) * 7;

    await query(
      `
        INSERT INTO quiz_results (quiz_id, student_id, score, submitted_at)
        VALUES ($1, $2, $3, NOW() - ($4::int * INTERVAL '1 day'))
      `,
      [row.quiz_id, row.student_id, score, i]
    );

    created += 1;
  }

  return created;
};

const run = async () => {
  const studentIds = await getTargetStudentIds();

  if (studentIds.length === 0) {
    console.log('SEED_RESULTS_TARGET_STUDENTS', 0);
    console.log('SEED_RESULTS_NOTE', 'No target students found for current filters.');
    return;
  }

  const assignmentsCreated = await createAssignments();
  const submissionsCreated = await createSampleSubmissions(studentIds);
  const quizResultsCreated = await createSampleQuizResults(studentIds);

  console.log('SEED_RESULTS_TARGET_STUDENTS', studentIds.length);
  console.log('SEED_RESULTS_ASSIGNMENTS_CREATED', assignmentsCreated);
  console.log('SEED_RESULTS_SUBMISSIONS_CREATED', submissionsCreated);
  console.log('SEED_RESULTS_QUIZ_RESULTS_CREATED', quizResultsCreated);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
