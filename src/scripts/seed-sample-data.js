require('dotenv').config();

const bcrypt = require('bcrypt');
const { query } = require('../config/database');

const DEFAULT_PASSWORD = '123456';

const users = [
  { fullName: 'Teacher Seed 1', email: 'teacher.seed1@example.com', role: 'teacher' },
  { fullName: 'Teacher Seed 2', email: 'teacher.seed2@example.com', role: 'teacher' },
  { fullName: 'Student Seed 1', email: 'student.seed1@example.com', role: 'student' },
  { fullName: 'Student Seed 2', email: 'student.seed2@example.com', role: 'student' },
  { fullName: 'Admin Seed 1', email: 'admin.seed1@example.com', role: 'admin' },
];

const courses = [
  {
    title: 'English Communication Basics',
    description: 'Build speaking confidence through daily communication patterns.',
    thumbnail: 'https://picsum.photos/seed/english-speaking/800/500',
    teacherEmail: 'teacher.seed1@example.com',
    lessons: [
      {
        orderIndex: 1,
        title: 'Greetings and Introductions',
        content: 'Learn how to introduce yourself and start simple conversations.',
        videoUrl: 'https://www.youtube.com/watch?v=0T9R7w4NfK8',
      },
      {
        orderIndex: 2,
        title: 'Daily Routine Vocabulary',
        content: 'Practice common vocabulary and sentence patterns for daily life.',
        videoUrl: 'https://www.youtube.com/watch?v=rx7p9Q6xk6U',
      },
    ],
  },
  {
    title: 'English Grammar in Context',
    description: 'Use grammar naturally in speaking and writing tasks.',
    thumbnail: 'https://picsum.photos/seed/english-grammar/800/500',
    teacherEmail: 'teacher.seed2@example.com',
    lessons: [
      {
        orderIndex: 1,
        title: 'Present Simple and Present Continuous',
        content: 'Understand when to use each tense with practical examples.',
        videoUrl: 'https://www.youtube.com/watch?v=tYjKaQ6mY4k',
      },
    ],
  },
];

const ensureRoles = async () => {
  await query(
    `INSERT INTO roles (name)
     VALUES ('student'), ('teacher'), ('admin')
     ON CONFLICT (name) DO NOTHING`
  );
};

const getRoleMap = async () => {
  const result = await query('SELECT id, name FROM roles');
  return new Map(result.rows.map((r) => [r.name, r.id]));
};

const hasLegacyRoleColumn = async () => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'role'
     ) AS ok`
  );

  return result.rows[0]?.ok === true;
};

const upsertUser = async ({ fullName, email, role }, roleId, hashedPassword, useLegacyRoleColumn) => {
  if (useLegacyRoleColumn) {
    const result = await query(
      `INSERT INTO users (full_name, email, password, role_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password = EXCLUDED.password,
         role_id = EXCLUDED.role_id,
         role = EXCLUDED.role,
         updated_at = NOW()
       RETURNING id, email`,
      [fullName, email, hashedPassword, roleId, role]
    );

    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO users (full_name, email, password, role_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password = EXCLUDED.password,
       role_id = EXCLUDED.role_id,
       updated_at = NOW()
     RETURNING id, email`,
    [fullName, email, hashedPassword, roleId]
  );

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
};

const upsertCourse = async ({ title, description, thumbnail, teacherId }) => {
  const found = await query('SELECT id FROM courses WHERE title = $1 AND teacher_id = $2 LIMIT 1', [title, teacherId]);

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE courses
       SET description = $1,
           thumbnail = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id`,
      [description, thumbnail, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO courses (title, description, thumbnail, teacher_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [title, description, thumbnail, teacherId]
  );

  return inserted.rows[0].id;
};

const upsertLesson = async (courseId, lesson) => {
  const found = await query(
    'SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2 LIMIT 1',
    [courseId, lesson.orderIndex]
  );

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE lessons
       SET title = $1,
           content = $2,
           video_url = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id`,
      [lesson.title, lesson.content, lesson.videoUrl, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO lessons (course_id, title, content, video_url, order_index, duration, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 900, NOW(), NOW())
     RETURNING id`,
    [courseId, lesson.title, lesson.content, lesson.videoUrl, lesson.orderIndex]
  );

  return inserted.rows[0].id;
};

const ensureEnrollments = async (studentIds, courseId) => {
  for (const studentId of studentIds) {
    await query(
      `INSERT INTO enrollments (student_id, course_id, progress, enrolled_at)
       VALUES ($1, $2, 20, NOW())
       ON CONFLICT (student_id, course_id)
       DO UPDATE SET progress = EXCLUDED.progress`,
      [studentId, courseId]
    );
  }
};

const run = async () => {
  await ensureRoles();
  const roleMap = await getRoleMap();
  const legacyRoleColumn = await hasLegacyRoleColumn();
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of users) {
    const roleId = roleMap.get(user.role);
    if (!roleId) throw new Error(`Missing role: ${user.role}`);
    await upsertUser(user, roleId, hash, legacyRoleColumn);
  }

  const student1 = await findUserByEmail('student.seed1@example.com');
  const student2 = await findUserByEmail('student.seed2@example.com');

  for (const item of courses) {
    const teacher = await findUserByEmail(item.teacherEmail);
    if (!teacher) throw new Error(`Missing teacher: ${item.teacherEmail}`);

    const courseId = await upsertCourse({
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      teacherId: teacher.id,
    });

    for (const lesson of item.lessons) {
      await upsertLesson(courseId, lesson);
    }

    await ensureEnrollments([student1.id, student2.id], courseId);

    console.log(`SEEDED_COURSE: ${item.title} | ${courseId}`);
  }

  console.log('SEED_DONE');
  console.log('LOGIN_PASSWORD_FOR_SEEDED_USERS:', DEFAULT_PASSWORD);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
