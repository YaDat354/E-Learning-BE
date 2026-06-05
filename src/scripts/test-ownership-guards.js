require('dotenv').config();

const authService = require('../services/auth.service');
const courseService = require('../services/course.service');
const lessonService = require('../services/lesson.service');
const quizService = require('../services/quiz.service');
const assignmentService = require('../services/assignment.service');
const { query } = require('../config/database');

const expectForbiddenCode = async (label, fn, expectedCodes = ['TEACHER_COURSE_FORBIDDEN', 'RESOURCE_NOT_OWNED']) => {
  try {
    await fn();
    console.error(`FAIL ${label}: expected 403 but operation succeeded`);
    return false;
  } catch (error) {
    if (error.statusCode !== 403) {
      console.error(`FAIL ${label}: expected 403 but got ${error.statusCode || 'unknown'}`);
      return false;
    }

    if (error.code && !expectedCodes.includes(error.code)) {
      console.error(`FAIL ${label}: expected code in [${expectedCodes.join(', ')}] but got ${error.code}`);
      return false;
    }

    console.log(`PASS ${label}: blocked with 403 (${error.code || 'NO_CODE'})`);
    return true;
  }
};

const createAssignmentRecord = async ({ courseId, lessonId, title, description, dueDate, maxScore }) => {
  const columns = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'assignments'"
  );

  const hasLessonId = columns.rows.some((row) => row.column_name === 'lesson_id');

  if (hasLessonId) {
    const inserted = await query(
      `
        INSERT INTO assignments (course_id, lesson_id, title, description, due_date, max_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, course_id, lesson_id, title, description, due_date, max_score
      `,
      [courseId, lessonId, title, description || null, dueDate || null, maxScore ?? 100]
    );

    return inserted.rows[0];
  }

  const inserted = await query(
    `
      INSERT INTO assignments (course_id, title, description, due_date, max_score)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, course_id, title, description, due_date, max_score
    `,
    [courseId, title, description || null, dueDate || null, maxScore ?? 100]
  );

  return inserted.rows[0];
};

const createQuizRecord = async ({ courseId, lessonId, title, description, timeLimit }) => {
  const columns = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'quizzes'"
  );

  const hasLessonId = columns.rows.some((row) => row.column_name === 'lesson_id');

  if (hasLessonId) {
    const inserted = await query(
      `
        INSERT INTO quizzes (course_id, lesson_id, title, description, time_limit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, course_id, lesson_id, title, description, time_limit
      `,
      [courseId, lessonId, title, description || null, timeLimit || null]
    );

    return inserted.rows[0];
  }

  const inserted = await query(
    `
      INSERT INTO quizzes (course_id, title, description, time_limit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, course_id, title, description, time_limit
    `,
    [courseId, title, description || null, timeLimit || null]
  );

  return inserted.rows[0];
};

const run = async () => {
  const suffix = Date.now().toString();

  const teacherAReg = await authService.register({
    fullName: 'Ownership Teacher A',
    email: `ownerA_${suffix}@example.com`,
    password: '123456',
    role: 'teacher',
  });

  const teacherBReg = await authService.register({
    fullName: 'Ownership Teacher B',
    email: `ownerB_${suffix}@example.com`,
    password: '123456',
    role: 'teacher',
  });

  const teacherA = { id: teacherAReg.user.id, role: 'teacher' };
  const teacherB = { id: teacherBReg.user.id, role: 'teacher' };

  const courseA = await courseService.createCourse({
    title: `Ownership Course A ${suffix}`,
    level: 'co_ban',
    description: 'Course owned by teacher A',
    teacherId: teacherA.id,
  });

  const courseB = await courseService.createCourse({
    title: `Ownership Course B ${suffix}`,
    level: 'co_ban',
    description: 'Course owned by teacher B',
    teacherId: teacherB.id,
  });

  const lessonA = await lessonService.createLesson(
    courseA.id,
    { title: `Lesson A ${suffix}`, content: 'A', orderIndex: 1 },
    teacherA
  );

  const quizA = await createQuizRecord({
    courseId: courseA.id,
    lessonId: lessonA.id,
    title: `Quiz A ${suffix}`,
    description: 'quiz',
    timeLimit: 10,
  });

  const assignmentA = await createAssignmentRecord({
    courseId: courseA.id,
    lessonId: lessonA.id,
    title: `Assignment A ${suffix}`,
    description: 'asg',
    maxScore: 100,
  });

  let allPass = true;

  allPass = (await expectForbiddenCode('Teacher B cannot update course A', () =>
    courseService.updateCourse(courseA.id, { title: 'Hacked' }, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot delete course A', () =>
    courseService.deleteCourse(courseA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot read course A detail', () =>
    courseService.getCourseById(courseA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher A cannot create lesson on course B', () =>
    lessonService.createLesson(courseB.id, { title: 'Nope', orderIndex: 1 }, teacherA)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot update lesson A (nested)', () =>
    lessonService.updateLesson(courseA.id, lessonA.id, { title: 'Nope' }, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot delete lesson A (nested)', () =>
    lessonService.deleteLesson(courseA.id, lessonA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot read standalone lesson A', () =>
    lessonService.getLessonByIdStandalone(lessonA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot update standalone lesson A', () =>
    lessonService.updateLessonByIdStandalone(lessonA.id, { title: 'Nope' }, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot delete standalone lesson A', () =>
    lessonService.deleteLessonByIdStandalone(lessonA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher A cannot create quiz on course B', () =>
    quizService.createQuiz(courseB.id, { title: 'Nope', timeLimit: 10 }, teacherA)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot read quiz A detail', () =>
    quizService.getQuizById(courseA.id, quizA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot update quiz A', () =>
    quizService.updateQuiz(courseA.id, quizA.id, { title: 'Nope' }, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot delete quiz A', () =>
    quizService.deleteQuiz(courseA.id, quizA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot read assignment A detail', () =>
    assignmentService.getAssignmentById(courseA.id, assignmentA.id, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot update assignment A', () =>
    assignmentService.updateAssignment(courseA.id, assignmentA.id, { title: 'Nope' }, teacherB)
  )) && allPass;

  allPass = (await expectForbiddenCode('Teacher B cannot delete assignment A', () =>
    assignmentService.deleteAssignment(courseA.id, assignmentA.id, teacherB)
  )) && allPass;

  if (!allPass) {
    process.exit(1);
  }

  console.log('ALL_OWNERSHIP_GUARDS_PASS');
};

run().catch((error) => {
  console.error('Ownership test failed with unexpected error:', error.message);
  process.exit(1);
});
