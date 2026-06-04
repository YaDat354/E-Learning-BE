require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');

const payloadPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'data/real-data.json');

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

const upsertUser = async ({ fullName, email, role, password }, roleId, useLegacyRoleColumn) => {
  const hashedPassword = await bcrypt.hash(password || '123456', 10);

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

const upsertCourse = async ({ title, level, description, thumbnail, teacherId }) => {
  const found = await query('SELECT id FROM courses WHERE title = $1 AND teacher_id = $2 LIMIT 1', [title, teacherId]);

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE courses
       SET level = $1,
           description = $2,
           thumbnail = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id`,
      [level || 'co_ban', description || null, thumbnail || null, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO courses (title, level, description, thumbnail, teacher_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [title, level || 'co_ban', description || null, thumbnail || null, teacherId]
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
      [lesson.title, lesson.content || null, lesson.videoUrl || null, found.rows[0].id]
    );
    return updated.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO lessons (course_id, title, content, video_url, order_index, duration, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id`,
    [courseId, lesson.title, lesson.content || null, lesson.videoUrl || null, lesson.orderIndex, lesson.duration || 0]
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

const upsertAssignment = async (courseId, lessonId, assignment, assignmentColumns) => {
  const hasLessonId = assignmentColumns.has('lesson_id');
  const hasCourseId = assignmentColumns.has('course_id');

  const found = hasLessonId
    ? await query('SELECT id FROM assignments WHERE lesson_id = $1 AND title = $2 LIMIT 1', [lessonId, assignment.title])
    : await query('SELECT id FROM assignments WHERE course_id = $1 AND title = $2 LIMIT 1', [courseId, assignment.title]);

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
        ? [assignment.description || null, assignment.dueDate || null, assignment.maxScore || 100, found.rows[0].id]
        : [assignment.description || null, assignment.dueDate || null, found.rows[0].id]
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
    ? await query('SELECT id FROM quizzes WHERE lesson_id = $1 AND title = $2 LIMIT 1', [lessonId, quiz.title])
    : await query('SELECT id FROM quizzes WHERE course_id = $1 AND title = $2 LIMIT 1', [courseId, quiz.title]);

  if (found.rows[0]) {
    const updated = await query(
      `UPDATE quizzes
       SET ${quizColumns.has('description') ? 'description = $1,' : ''}
           time_limit = $${quizColumns.has('description') ? '2' : '1'},
           updated_at = NOW()
       WHERE id = $${quizColumns.has('description') ? '3' : '2'}
       RETURNING id`,
      quizColumns.has('description')
        ? [quiz.description || null, quiz.timeLimit || null, found.rows[0].id]
        : [quiz.timeLimit || null, found.rows[0].id]
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

const upsertQuestionWithAnswers = async (quizId, question) => {
  const found = await query('SELECT id FROM questions WHERE quiz_id = $1 AND order_index = $2 LIMIT 1', [quizId, question.orderIndex]);

  let questionId;
  if (found.rows[0]) {
    const updated = await query(
      `UPDATE questions
       SET content = $1,
           type = $2,
           updated_at = NOW()
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

const ensureEnrollments = async (studentEmails, courseId) => {
  for (const studentEmail of studentEmails || []) {
    const student = await findUserByEmail(studentEmail);
    if (!student) continue;

    await query(
      `INSERT INTO enrollments (student_id, course_id, progress, enrolled_at)
       VALUES ($1, $2, 0, NOW())
       ON CONFLICT (student_id, course_id)
       DO NOTHING`,
      [student.id, courseId]
    );
  }
};

const upsertDiscussion = async ({ courseId, userId, content, parentId }) => {
  const found = await query(
    `SELECT id
     FROM discussions
     WHERE course_id = $1
       AND user_id = $2
       AND content = $3
       AND ((parent_id IS NULL AND $4::uuid IS NULL) OR parent_id = $4)
     LIMIT 1`,
    [courseId, userId, content, parentId || null]
  );

  if (found.rows[0]) {
    return found.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO discussions (course_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [courseId, userId, content, parentId || null]
  );

  return inserted.rows[0]?.id || null;
};

const run = async () => {
  if (!fs.existsSync(payloadPath)) {
    console.error(`Import file not found: ${payloadPath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const users = Array.isArray(payload.users) ? payload.users : [];
  const courses = Array.isArray(payload.courses) ? payload.courses : [];

  await ensureRoles();
  const roleMap = await getRoleMap();
  const legacyRoleColumn = await hasLegacyRoleColumn();
  const assignmentColumns = await getColumnSet('assignments');
  const quizColumns = await getColumnSet('quizzes');

  for (const user of users) {
    const roleId = roleMap.get(user.role || 'student');
    if (!roleId) continue;
    await upsertUser(user, roleId, legacyRoleColumn);
  }

  for (const course of courses) {
    const teacher = await findUserByEmail(course.teacherEmail);
    if (!teacher) {
      console.log(`SKIP_COURSE_NO_TEACHER: ${course.title}`);
      continue;
    }

    const courseId = await upsertCourse({
      title: course.title,
      level: course.level,
      description: course.description,
      thumbnail: course.thumbnail,
      teacherId: teacher.id,
    });

    for (const lesson of course.lessons || []) {
      await upsertLesson(courseId, lesson);
    }

    const firstLessonId = await findLessonIdByOrder(courseId, 1);

    for (const assignment of course.assignments || []) {
      await upsertAssignment(courseId, firstLessonId, assignment, assignmentColumns);
    }

    for (const quiz of course.quizzes || []) {
      const quizId = await upsertQuiz(courseId, firstLessonId, quiz, quizColumns);
      for (const question of quiz.questions || []) {
        await upsertQuestionWithAnswers(quizId, question);
      }
    }

    const discussionIds = [];
    for (const discussion of course.discussions || []) {
      if (!discussion?.authorEmail || !discussion?.content) continue;
      const author = await findUserByEmail(discussion.authorEmail);
      if (!author) continue;

      const parentId = Number.isInteger(discussion.parentIndex)
        ? (discussionIds[discussion.parentIndex] || null)
        : null;

      const discussionId = await upsertDiscussion({
        courseId,
        userId: author.id,
        content: discussion.content,
        parentId,
      });

      discussionIds.push(discussionId);
    }

    await ensureEnrollments(course.enrolledStudentEmails || [], courseId);

    console.log(`IMPORTED_COURSE: ${course.title} | ${courseId}`);
  }

  console.log('IMPORT_REAL_DATA_DONE');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
