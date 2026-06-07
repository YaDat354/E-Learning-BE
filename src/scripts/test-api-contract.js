require('dotenv').config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const requestJson = async (path, { method = 'GET', token, body } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  return {
    status: response.status,
    payload,
  };
};

const run = async () => {
  const suffix = Date.now();
  const teacherEmail = `contract.teacher.${suffix}@gmail.com`;
  const studentEmail = `contract.student.${suffix}@gmail.com`;

  const health = await requestJson('/health');
  assert(health.status === 200, `health expected 200, got ${health.status}`);
  assert(health.payload?.success === true, 'health payload.success must be true');

  const badRegister = await requestJson('/api/v1/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Bad Email User',
      email: 'invalid-email',
      password: '123456',
    },
  });
  assert(badRegister.status === 400, `bad register expected 400, got ${badRegister.status}`);

  const teacherRegister = await requestJson('/api/v1/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Contract Teacher',
      email: teacherEmail,
      password: '123456',
      role: 'teacher',
    },
  });

  assert(teacherRegister.status === 201, `teacher register expected 201, got ${teacherRegister.status}`);
  assert(teacherRegister.payload?.success === true, 'teacher register success must be true');
  assert(Boolean(teacherRegister.payload?.data?.user?.id), 'teacher register must return data.user.id');
  assert(Boolean(teacherRegister.payload?.data?.accessToken), 'teacher register must return data.accessToken');

  const studentRegister = await requestJson('/api/v1/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Contract Student',
      email: studentEmail,
      password: '123456',
      role: 'student',
    },
  });

  assert(studentRegister.status === 201, `student register expected 201, got ${studentRegister.status}`);

  const duplicateRegister = await requestJson('/api/v1/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Contract Student Duplicate',
      email: studentEmail,
      password: '123456',
      role: 'student',
    },
  });
  assert(duplicateRegister.status === 409, `duplicate register expected 409, got ${duplicateRegister.status}`);

  const teacherToken = teacherRegister.payload.data.accessToken;
  const studentToken = studentRegister.payload.data.accessToken;

  const createCourse = await requestJson('/api/v1/courses', {
    method: 'POST',
    token: teacherToken,
    body: {
      title: `Contract Course ${suffix}`,
      level: 'co_ban',
      description: 'Contract testing course',
    },
  });

  assert(createCourse.status === 201, `create course expected 201, got ${createCourse.status}`);
  const courseId = createCourse.payload?.data?.id;
  assert(Boolean(courseId), 'create course must return course id');

  const enroll = await requestJson(`/api/v1/courses/${courseId}/enroll`, {
    method: 'POST',
    token: studentToken,
  });
  assert(enroll.status === 201, `enroll expected 201, got ${enroll.status}`);

  const reviewNoToken = await requestJson(`/api/v1/courses/${courseId}/reviews`, {
    method: 'POST',
    body: {
      rating: 5,
      comment: 'Great course',
    },
  });
  assert(reviewNoToken.status === 401, `review without token expected 401, got ${reviewNoToken.status}`);

  const reviewBadRating = await requestJson(`/api/v1/courses/${courseId}/reviews`, {
    method: 'POST',
    token: studentToken,
    body: {
      rating: 7,
      comment: 'Bad rating should fail',
    },
  });
  assert(reviewBadRating.status === 400, `review invalid rating expected 400, got ${reviewBadRating.status}`);

  const reviewCreate = await requestJson(`/api/v1/courses/${courseId}/reviews`, {
    method: 'POST',
    token: studentToken,
    body: {
      rating: 5,
      comment: 'Noi dung khoa hoc rat de hieu.',
    },
  });
  assert(reviewCreate.status === 201, `review create expected 201, got ${reviewCreate.status}`);

  const reviewSummary = await requestJson(`/api/v1/courses/${courseId}/reviews/summary`);
  assert(reviewSummary.status === 200, `review summary expected 200, got ${reviewSummary.status}`);
  assert(Number(reviewSummary.payload?.data?.totalReviews) >= 1, 'review summary totalReviews must be >= 1');

  const chatbotBadMessage = await requestJson('/api/v1/chatbot/chat', {
    method: 'POST',
    body: {
      message: '',
    },
  });
  assert(chatbotBadMessage.status === 400, `chatbot bad message expected 400, got ${chatbotBadMessage.status}`);

  const chatbotAliasAi = await requestJson('/api/v1/ai/chat', {
    method: 'POST',
    body: {
      message: '',
    },
  });
  assert(chatbotAliasAi.status === 400, `ai alias bad message expected 400, got ${chatbotAliasAi.status}`);

  const chatbotAliasAssistant = await requestJson('/api/v1/assistant/chat', {
    method: 'POST',
    body: {
      message: '',
    },
  });
  assert(chatbotAliasAssistant.status === 400, `assistant alias bad message expected 400, got ${chatbotAliasAssistant.status}`);

  console.log('CONTRACT_HEALTH_OK');
  console.log('CONTRACT_AUTH_REGISTER_LOGIN_OK');
  console.log('CONTRACT_COURSE_ENROLL_REVIEW_OK', courseId);
  console.log('CONTRACT_CHATBOT_ENDPOINTS_OK');
};

run().catch((error) => {
  console.error('CONTRACT_TEST_FAILED:', error.message);
  process.exit(1);
});
