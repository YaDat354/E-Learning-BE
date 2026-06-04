require('dotenv').config();

const authService = require('../services/auth.service');
const courseService = require('../services/course.service');
const enrollmentService = require('../services/enrollment.service');

const run = async () => {
  const suffix = Date.now().toString();
  const teacherEmail = `teacher_${suffix}@example.com`;
  const studentEmail = `student_${suffix}@example.com`;

  const [teacher, student] = await Promise.all([
    authService.register({
      fullName: 'Smoke Teacher',
      email: teacherEmail,
      password: '123456',
      role: 'teacher',
    }),
    authService.register({
      fullName: 'Smoke Student',
      email: studentEmail,
      password: '123456',
      role: 'student',
    }),
  ]);

  const course = await courseService.createCourse({
    title: `Smoke Course ${suffix}`,
    level: 'co_ban',
    description: 'Smoke test course',
    teacherId: teacher.user.id,
  });

  const enrollment = await enrollmentService.enrollCourse({
    studentId: student.user.id,
    courseId: course.id,
    userRole: 'student',
  });

  const myEnrollments = await enrollmentService.getMyEnrollments(student.user.id);

  console.log('AUTH_TEACHER_OK', teacher.user.email);
  console.log('AUTH_STUDENT_OK', student.user.email);
  console.log('COURSE_CREATED_OK', course.id);
  console.log('ENROLLMENT_CREATED_OK', enrollment.id);
  console.log('MY_ENROLLMENTS_OK', myEnrollments.length);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
