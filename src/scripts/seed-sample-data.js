require('dotenv').config();

const bcrypt = require('bcrypt');
const { query } = require('../config/database');

const DEFAULT_PASSWORD = '123456';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const BULK_TEACHERS = toPositiveInt(process.env.SEED_BULK_TEACHERS, 5);
const BULK_STUDENTS = toPositiveInt(process.env.SEED_BULK_STUDENTS, 40);
const BULK_COURSES = toPositiveInt(process.env.SEED_BULK_COURSES, 60);
const LESSONS_PER_COURSE = toPositiveInt(process.env.SEED_LESSONS_PER_COURSE, 5);
const ASSIGNMENTS_PER_COURSE = toPositiveInt(process.env.SEED_ASSIGNMENTS_PER_COURSE, 2);
const QUIZZES_PER_COURSE = toPositiveInt(process.env.SEED_QUIZZES_PER_COURSE, 2);
const QUESTIONS_PER_QUIZ = toPositiveInt(process.env.SEED_QUESTIONS_PER_QUIZ, 4);
const ENROLLMENTS_PER_COURSE = toPositiveInt(process.env.SEED_ENROLLMENTS_PER_COURSE, 25);

const VN_LAST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ',
];

const VN_MIDDLE_NAMES = [
  'Văn', 'Thị', 'Hồng', 'Minh', 'Ngọc', 'Quốc', 'Đức', 'Anh', 'Gia', 'Thanh',
];

const VN_FIRST_NAMES = [
  'An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hiếu', 'Hòa', 'Hùng', 'Khánh',
  'Lâm', 'Linh', 'Long', 'Nam', 'Nga', 'Ngọc', 'Nhi', 'Phương', 'Quân', 'Quỳnh',
  'Sơn', 'Tâm', 'Thảo', 'Thu', 'Tiến', 'Trang', 'Trinh', 'Trung', 'Tuấn', 'Vy',
];

const buildVietnameseFullName = (index) => {
  const last = VN_LAST_NAMES[index % VN_LAST_NAMES.length];
  const middle = VN_MIDDLE_NAMES[(index * 3) % VN_MIDDLE_NAMES.length];
  const first = VN_FIRST_NAMES[(index * 7) % VN_FIRST_NAMES.length];
  return `${last} ${middle} ${first}`;
};

const buildBulkUsers = () => {
  const list = [];

  for (let i = 1; i <= BULK_TEACHERS; i += 1) {
    list.push({
      fullName: buildVietnameseFullName(i),
      email: `teacher.bulk${i}@gmail.com`,
      role: 'teacher',
    });
  }

  for (let i = 1; i <= BULK_STUDENTS; i += 1) {
    list.push({
      fullName: buildVietnameseFullName(i + 1000),
      email: `student.bulk${i}@gmail.com`,
      role: 'student',
    });
  }

  return list;
};

const buildBulkCourses = () => {
  const courses = [];

  for (let i = 1; i <= BULK_COURSES; i += 1) {
    const teacherIndex = ((i - 1) % BULK_TEACHERS) + 1;
    const lessons = [];
    const assignments = [];
    const quizzes = [];

    for (let lessonIndex = 1; lessonIndex <= LESSONS_PER_COURSE; lessonIndex += 1) {
      lessons.push({
        orderIndex: lessonIndex,
        title: `Bulk Lesson ${lessonIndex}`,
        content: `Generated content for course ${i}, lesson ${lessonIndex}.`,
        videoUrl: `https://example.com/videos/course-${i}-lesson-${lessonIndex}`,
      });
    }

    for (let assignmentIndex = 1; assignmentIndex <= ASSIGNMENTS_PER_COURSE; assignmentIndex += 1) {
      assignments.push({
        title: `Bulk Assignment ${assignmentIndex}`,
        description: `Assignment ${assignmentIndex} for generated course ${i}.`,
        maxScore: 100,
        dueDate: '2026-12-31T23:59:59.000Z',
      });
    }

    for (let quizIndex = 1; quizIndex <= QUIZZES_PER_COURSE; quizIndex += 1) {
      const questions = [];

      for (let questionIndex = 1; questionIndex <= QUESTIONS_PER_QUIZ; questionIndex += 1) {
        questions.push({
          orderIndex: questionIndex,
          content: `Course ${i} Quiz ${quizIndex} Question ${questionIndex}`,
          type: 'single_choice',
          answers: [
            { content: 'Option A', isCorrect: true },
            { content: 'Option B', isCorrect: false },
            { content: 'Option C', isCorrect: false },
            { content: 'Option D', isCorrect: false },
          ],
        });
      }

      quizzes.push({
        title: `Bulk Quiz ${quizIndex}`,
        description: `Generated quiz ${quizIndex} for course ${i}.`,
        timeLimit: 1200,
        questions,
      });
    }

    courses.push({
      title: `Bulk Course ${i}`,
      description: `Generated course ${i} for large dataset testing.`,
      thumbnail: `https://picsum.photos/seed/bulk-course-${i}/800/500`,
      teacherEmail: `teacher.bulk${teacherIndex}@example.com`,
      lessons,
      assignments,
      quizzes,
    });
  }

  return courses;
};

const baseUsers = [
  { fullName: 'Nguyễn Văn Minh', email: 'teacher.seed1@gmail.com', role: 'teacher' },
  { fullName: 'Trần Thị Lan', email: 'teacher.seed2@gmail.com', role: 'teacher' },
  { fullName: 'Lê Quốc Bảo', email: 'student.seed1@gmail.com', role: 'student' },
  { fullName: 'Phạm Ngọc Anh', email: 'student.seed2@gmail.com', role: 'student' },
  { fullName: 'Hoàng Gia Phúc', email: 'admin.seed1@gmail.com', role: 'admin' },
];

const baseCourses = [
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
    assignments: [
      {
        title: 'Self Introduction Recording',
        description: 'Record a 2-minute introduction video and submit the link.',
        maxScore: 100,
        dueDate: '2026-12-31T23:59:59.000Z',
      },
    ],
    quizzes: [
      {
        title: 'Greetings Quiz',
        description: 'Check your understanding of basic greetings.',
        timeLimit: 900,
        questions: [
          {
            orderIndex: 1,
            content: 'Choose a common way to greet someone.',
            type: 'single_choice',
            answers: [
              { content: 'Hello', isCorrect: true },
              { content: 'Good night', isCorrect: false },
              { content: 'See you yesterday', isCorrect: false },
            ],
          },
          {
            orderIndex: 2,
            content: '"How are you?" is usually used to:',
            type: 'single_choice',
            answers: [
              { content: 'Ask about someone status', isCorrect: true },
              { content: 'Say goodbye', isCorrect: false },
              { content: 'Ask for permission', isCorrect: false },
            ],
          },
        ],
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
    assignments: [
      {
        title: 'Grammar Exercise Sheet',
        description: 'Complete and submit the tense correction worksheet.',
        maxScore: 100,
        dueDate: '2026-12-20T23:59:59.000Z',
      },
    ],
    quizzes: [
      {
        title: 'Present Tense Quiz',
        description: 'Practice present simple and present continuous.',
        timeLimit: 1200,
        questions: [
          {
            orderIndex: 1,
            content: 'She ____ to school every day.',
            type: 'single_choice',
            answers: [
              { content: 'goes', isCorrect: true },
              { content: 'is going', isCorrect: false },
              { content: 'go', isCorrect: false },
            ],
          },
          {
            orderIndex: 2,
            content: 'Look! They ____ football now.',
            type: 'single_choice',
            answers: [
              { content: 'play', isCorrect: false },
              { content: 'are playing', isCorrect: true },
              { content: 'plays', isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
];

const users = [...baseUsers, ...buildBulkUsers()];
const courses = [...baseCourses, ...buildBulkCourses()];

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

const hasColumn = async (tableName, columnName) => {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS ok`,
    [tableName, columnName]
  );

  return result.rows[0]?.ok === true;
};

const getColumnSet = async (tableName) => {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
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

const findLessonIdByOrder = async (courseId, orderIndex) => {
  const result = await query(
    'SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2 LIMIT 1',
    [courseId, orderIndex]
  );
  return result.rows[0]?.id || null;
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

const pickStudentIds = (studentIds, courseNumberSeed, targetCount) => {
  if (!studentIds.length) return [];

  const picked = [];
  const start = courseNumberSeed % studentIds.length;
  const count = Math.min(targetCount, studentIds.length);

  for (let i = 0; i < count; i += 1) {
    const idx = (start + i) % studentIds.length;
    picked.push(studentIds[idx]);
  }

  return picked;
};

const upsertAssignment = async (courseId, lessonId, assignment, assignmentColumns) => {
  const hasLessonId = assignmentColumns.has('lesson_id');
  const hasCourseId = assignmentColumns.has('course_id');

  const found = hasLessonId
    ? await query(
        'SELECT id FROM assignments WHERE lesson_id = $1 AND title = $2 LIMIT 1',
        [lessonId, assignment.title]
      )
    : await query(
        'SELECT id FROM assignments WHERE course_id = $1 AND title = $2 LIMIT 1',
        [courseId, assignment.title]
      );

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE assignments
       SET description = $1,
           due_date = $2,
           ${assignmentColumns.has('max_score') ? 'max_score = $3,' : ''}
           updated_at = NOW()
       WHERE id = $${assignmentColumns.has('max_score') ? '4' : '3'}
       RETURNING id`,
      assignmentColumns.has('max_score')
        ? [assignment.description, assignment.dueDate, assignment.maxScore, found.rows[0].id]
        : [assignment.description, assignment.dueDate, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = hasLessonId && hasCourseId
    ? await query(
        `INSERT INTO assignments (lesson_id, course_id, title, description, due_date${assignmentColumns.has('max_score') ? ', max_score' : ''})
         VALUES ($1, $2, $3, $4, $5${assignmentColumns.has('max_score') ? ', $6' : ''})
         RETURNING id`,
        assignmentColumns.has('max_score')
          ? [lessonId, courseId, assignment.title, assignment.description || null, assignment.dueDate || null, assignment.maxScore || 100]
          : [lessonId, courseId, assignment.title, assignment.description || null, assignment.dueDate || null]
      )
    : hasLessonId
    ? await query(
        `INSERT INTO assignments (lesson_id, title, description, due_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [lessonId, assignment.title, assignment.description || null, assignment.dueDate || null]
      )
    : await query(
        `INSERT INTO assignments (course_id, title, description, due_date, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [courseId, assignment.title, assignment.description || null, assignment.dueDate || null, assignment.maxScore || 100]
      );

  return inserted.rows[0].id;
};

const upsertQuiz = async (courseId, lessonId, quiz, quizColumns) => {
  const hasLessonId = quizColumns.has('lesson_id');
  const hasCourseId = quizColumns.has('course_id');

  const found = hasLessonId
    ? await query(
        'SELECT id FROM quizzes WHERE lesson_id = $1 AND title = $2 LIMIT 1',
        [lessonId, quiz.title]
      )
    : await query(
        'SELECT id FROM quizzes WHERE course_id = $1 AND title = $2 LIMIT 1',
        [courseId, quiz.title]
      );

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE quizzes
       SET description = $1,
           time_limit = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id`,
      [quiz.description || null, quiz.timeLimit || null, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = hasLessonId && hasCourseId
    ? await query(
        `INSERT INTO quizzes (lesson_id, course_id, title${quizColumns.has('description') ? ', description' : ''}, time_limit)
         VALUES ($1, $2, $3${quizColumns.has('description') ? ', $4' : ''}, $${quizColumns.has('description') ? '5' : '4'})
         RETURNING id`,
        quizColumns.has('description')
          ? [lessonId, courseId, quiz.title, quiz.description || null, quiz.timeLimit || null]
          : [lessonId, courseId, quiz.title, quiz.timeLimit || null]
      )
    : hasLessonId
    ? await query(
        `INSERT INTO quizzes (lesson_id, title, time_limit)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [lessonId, quiz.title, quiz.timeLimit || null]
      )
    : await query(
        `INSERT INTO quizzes (course_id, title, description, time_limit)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [courseId, quiz.title, quiz.description || null, quiz.timeLimit || null]
      );

  return inserted.rows[0].id;
};

const upsertQuestionWithAnswers = async (quizId, question, questionColumns) => {
  const found = await query(
    'SELECT id FROM questions WHERE quiz_id = $1 AND order_index = $2 LIMIT 1',
    [quizId, question.orderIndex]
  );

  let questionId;

  if (found.rows[0]) {
    const hasUpdatedAt = questionColumns.has('updated_at');
    const updated = await query(
      `UPDATE questions
       SET content = $1,
           type = $2
           ${hasUpdatedAt ? ', updated_at = NOW()' : ''}
       WHERE id = $3
       RETURNING id`,
      [question.content, question.type, found.rows[0].id]
    );
    questionId = updated.rows[0].id;

    await query('DELETE FROM answers WHERE question_id = $1', [questionId]);
  } else {
    const inserted = await query(
      `INSERT INTO questions (quiz_id, content, type, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [quizId, question.content, question.type, question.orderIndex]
    );
    questionId = inserted.rows[0].id;
  }

  for (const answer of question.answers || []) {
    await query(
      `INSERT INTO answers (question_id, content, is_correct)
       VALUES ($1, $2, $3)`,
      [questionId, answer.content, Boolean(answer.isCorrect)]
    );
  }
};

const run = async () => {
  await ensureRoles();
  const roleMap = await getRoleMap();
  const legacyRoleColumn = await hasLegacyRoleColumn();
  const assignmentColumns = await getColumnSet('assignments');
  const quizColumns = await getColumnSet('quizzes');
  const questionColumns = await getColumnSet('questions');
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of users) {
    const roleId = roleMap.get(user.role);
    if (!roleId) throw new Error(`Missing role: ${user.role}`);
    await upsertUser(user, roleId, hash, legacyRoleColumn);
  }

  const student1 = await findUserByEmail('student.seed1@gmail.com');
  const student2 = await findUserByEmail('student.seed2@gmail.com');
  const allBulkStudents = [];

  for (let i = 1; i <= BULK_STUDENTS; i += 1) {
    const student = await findUserByEmail(`student.bulk${i}@gmail.com`);
    if (student) allBulkStudents.push(student.id);
  }

  const studentIdsForEnrollment = [student1?.id, student2?.id, ...allBulkStudents].filter(Boolean);

  for (let index = 0; index < courses.length; index += 1) {
    const item = courses[index];
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

    const firstLessonId = await findLessonIdByOrder(courseId, 1);

    for (const assignment of item.assignments || []) {
      await upsertAssignment(courseId, firstLessonId, assignment, assignmentColumns);
    }

    for (const quiz of item.quizzes || []) {
      const quizId = await upsertQuiz(courseId, firstLessonId, quiz, quizColumns);
      for (const question of quiz.questions || []) {
        await upsertQuestionWithAnswers(quizId, question, questionColumns);
      }
    }

    const selectedStudents = pickStudentIds(
      studentIdsForEnrollment,
      index + 1,
      ENROLLMENTS_PER_COURSE
    );

    await ensureEnrollments(selectedStudents, courseId);

    console.log(`SEEDED_COURSE: ${item.title} | ${courseId}`);
  }

  console.log('SEED_DONE');
  console.log('SEED_SUMMARY', {
    users: users.length,
    courses: courses.length,
    bulkTeachers: BULK_TEACHERS,
    bulkStudents: BULK_STUDENTS,
    lessonsPerCourse: LESSONS_PER_COURSE,
    assignmentsPerCourse: ASSIGNMENTS_PER_COURSE,
    quizzesPerCourse: QUIZZES_PER_COURSE,
    questionsPerQuiz: QUESTIONS_PER_QUIZ,
    enrollmentsPerCourse: ENROLLMENTS_PER_COURSE,
  });
  console.log('LOGIN_PASSWORD_FOR_SEEDED_USERS:', DEFAULT_PASSWORD);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
