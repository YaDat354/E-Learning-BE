#!/usr/bin/env node

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.yellow}ℹ${colors.reset} ${msg}`),
};

const makeRequest = (method, path, body = null, accessToken = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (accessToken) {
      options.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

const runTests = async () => {
  log.info('Starting comprehensive backend feature tests...\n');

  let testCount = 0;
  let passCount = 0;

  const assert = (condition, name) => {
    testCount++;
    if (condition) {
      log.success(name);
      passCount++;
    } else {
      log.error(name);
    }
  };

  try {
    // 1. Test user registration and login
    log.info('TEST 1: Auth & User Setup');
    const registerRes = await makeRequest('POST', '/api/v1/auth/register', {
      fullName: 'Test Teacher',
      email: `teacher${Date.now()}@test.com`,
      password: 'password123',
      role: 'teacher',
    });
    assert(registerRes.status === 201, 'Teacher registration should return 201');
    const teacherData = registerRes.body?.data;
    const teacherEmail = registerRes.body?.data?.email;

    const registerRes2 = await makeRequest('POST', '/api/v1/auth/register', {
      fullName: 'Test Student',
      email: `student${Date.now()}@test.com`,
      password: 'password123',
      role: 'student',
    });
    assert(registerRes2.status === 201, 'Student registration should return 201');
    const studentEmail = registerRes2.body?.data?.email;

    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: teacherEmail,
      password: 'password123',
    });
    assert(loginRes.status === 200, 'Teacher login should return 200');
    const teacherToken = loginRes.body?.data?.access_token || loginRes.body?.data?.accessToken;
    assert(teacherToken, 'Teacher token should be present');

    const loginRes2 = await makeRequest('POST', '/api/v1/auth/login', {
      email: studentEmail,
      password: 'password123',
    });
    assert(loginRes2.status === 200, 'Student login should return 200');
    const studentToken = loginRes2.body?.data?.access_token || loginRes2.body?.data?.accessToken;
    assert(studentToken, 'Student token should be present');

    // 2. Test POST /courses with lessons and quiz
    log.info('\nTEST 2: Create Course with Lessons and Quiz');
    const courseRes = await makeRequest(
      'POST',
      '/api/v1/courses',
      {
        title: 'Test Course with Content',
        level: 'co_ban',
        description: 'A course with lessons and quiz',
        price: 100000,
        lessons: [
          {
            title: 'Lesson 1',
            audioUrl: 'https://example.com/audio1.mp3',
            transcript: 'This is the transcript for lesson 1',
            quiz: {
              title: 'Quiz for Lesson 1',
              description: 'A test quiz',
              questions: [
                {
                  text: 'What is the capital of France?',
                  type: 'single_choice',
                  options: [
                    { text: 'Paris' },
                    { text: 'London' },
                    { text: 'Berlin' },
                  ],
                  correctIndex: 0,
                  explanation: 'Paris is the capital of France',
                },
              ],
            },
          },
        ],
      },
      teacherToken
    );
    assert(courseRes.status === 201, 'Course creation should return 201');
    const courseId = courseRes.body?.data?.id;
    assert(courseId, 'Course ID should be present');
    assert(courseRes.body?.data?.lessonCount === 1, 'Course should have 1 lesson');

    // 3. Test GET /courses/:courseId/students
    log.info('\nTEST 3: Get Course Enrolled Students');
    const studentsRes = await makeRequest(
      'GET',
      `/api/v1/courses/${courseId}/students`,
      null,
      teacherToken
    );
    assert(studentsRes.status === 200, 'Get students should return 200');
    assert(Array.isArray(studentsRes.body?.data), 'Students should be an array');

    // 4. Test Student Enrollment
    log.info('\nTEST 4: Student Enrollment');
    const enrollRes = await makeRequest(
      'POST',
      `/api/v1/courses/${courseId}/enroll`,
      {},
      studentToken
    );
    assert(enrollRes.status === 201, 'Enrollment should return 201');

    // 5. Test POST /me/quiz-results
    log.info('\nTEST 5: Submit Quiz Result (POST /me/quiz-results)');
    const quizzes = courseRes.body?.data?.lessons?.[0]?.quiz;
    const quizId = quizzes?.id;

    if (quizId) {
      const submitRes = await makeRequest(
        'POST',
        '/api/v1/quiz-results',
        {
          quizId,
          courseId,
          score: 85,
          submittedAt: new Date().toISOString(),
        },
        studentToken
      );
      assert(submitRes.status === 201, 'Quiz result submission should return 201');
    }

    // 6. Test GET /me/quiz-results
    log.info('\nTEST 6: Get Quiz Results (GET /me/quiz-results)');
    const myResultsRes = await makeRequest(
      'GET',
      '/api/v1/me/quiz-results',
      null,
      studentToken
    );
    assert(myResultsRes.status === 200, 'Get my quiz results should return 200');
    assert(Array.isArray(myResultsRes.body?.data), 'Quiz results should be an array');

    // 7. Test POST /courses/:courseId/meeting-notifications
    log.info('\nTEST 7: Create Meeting Notification');
    const meetingRes = await makeRequest(
      'POST',
      `/api/v1/courses/${courseId}/meeting-notifications`,
      {
        title: 'Online Class Meeting',
        description: 'Live discussion on lesson 1',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        meetingUrl: 'https://meet.example.com/class-123',
      },
      teacherToken
    );
    assert(meetingRes.status === 201, 'Meeting notification creation should return 201');
    const notificationId = meetingRes.body?.data?.id;
    assert(notificationId, 'Notification ID should be present');

    // 8. Test GET /meetings/notifications
    log.info('\nTEST 8: Get Meeting Notifications');
    const notificationsRes = await makeRequest(
      'GET',
      '/api/v1/meetings/notifications',
      null,
      studentToken
    );
    assert(notificationsRes.status === 200, 'Get notifications should return 200');
    assert(Array.isArray(notificationsRes.body?.data), 'Notifications should be an array');

    // 9. Test POST /meetings/notifications/:notificationId/acknowledge
    log.info('\nTEST 9: Acknowledge Meeting Notification');
    if (notificationId) {
      const ackRes = await makeRequest(
        'POST',
        `/api/v1/meetings/notifications/${notificationId}/acknowledge`,
        {},
        studentToken
      );
      assert(ackRes.status === 200, 'Acknowledge notification should return 200');
    }

    // 10. Test Course Deletion
    log.info('\nTEST 10: Delete Course');
    const deleteRes = await makeRequest(
      'DELETE',
      `/api/v1/courses/${courseId}`,
      null,
      teacherToken
    );
    assert(deleteRes.status === 200, 'Course deletion should return 200');

    log.info(`\n${colors.green}Test Summary: ${passCount}/${testCount} tests passed${colors.reset}\n`);

    if (passCount === testCount) {
      log.success('All tests passed!');
      process.exit(0);
    } else {
      log.error(`${testCount - passCount} test(s) failed!`);
      process.exit(1);
    }
  } catch (error) {
    log.error(`Test execution error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

runTests();
