#!/usr/bin/env node

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.yellow}ℹ${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.blue}DEBUG${colors.reset}: ${msg}`),
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
            rawBody: data,
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            rawBody: data,
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

const runDebug = async () => {
  log.info('Starting meeting notification debug...\n');

  try {
    // 1. Register teacher
    log.info('Step 1: Register teacher');
    const teacherEmail = `teacher${Date.now()}@test.com`;
    const registerRes = await makeRequest('POST', '/api/v1/auth/register', {
      fullName: 'Test Teacher',
      email: teacherEmail,
      password: 'password123',
      role: 'teacher',
    });
    log.debug(`Register status: ${registerRes.status}`);
    log.debug(`Register response: ${JSON.stringify(registerRes.body, null, 2)}`);

    if (registerRes.status !== 201) {
      log.error(`Teacher registration failed with status ${registerRes.status}`);
      return;
    }

    // 2. Login teacher
    log.info('\nStep 2: Login teacher');
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: teacherEmail,
      password: 'password123',
    });
    log.debug(`Login status: ${loginRes.status}`);
    log.debug(`Login response: ${JSON.stringify(loginRes.body, null, 2)}`);

    if (loginRes.status !== 200) {
      log.error(`Teacher login failed with status ${loginRes.status}`);
      return;
    }

    const teacherToken = loginRes.body?.data?.accessToken;
    if (!teacherToken) {
      log.error('No access token in login response');
      return;
    }
    log.success('Teacher token obtained');

    // 3. Create course
    log.info('\nStep 3: Create course');
    const createCourseRes = await makeRequest(
      'POST',
      '/api/v1/courses',
      {
        title: 'Test Course',
        level: 'co_ban',
        description: 'Test course for meeting notifications',
        thumbnail: 'https://example.com/thumb.jpg',
        price: 0,
      },
      teacherToken
    );
    log.debug(`Create course status: ${createCourseRes.status}`);
    log.debug(`Create course response: ${JSON.stringify(createCourseRes.body, null, 2)}`);

    if (createCourseRes.status !== 201) {
      log.error(`Course creation failed with status ${createCourseRes.status}`);
      return;
    }

    const courseId = createCourseRes.body?.data?.id;
    if (!courseId) {
      log.error('No course ID in response');
      return;
    }
    log.success(`Course created: ${courseId}`);

    // 4. Create meeting notification
    log.info('\nStep 4: Create meeting notification');
    const meetingPayload = {
      title: 'Online Class Meeting',
      description: 'Live discussion on lesson 1',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      meetingUrl: 'https://meet.example.com/class-123',
    };
    log.debug(`Request payload: ${JSON.stringify(meetingPayload, null, 2)}`);
    log.debug(`Request token: ${teacherToken.substring(0, 20)}...`);

    const meetingRes = await makeRequest(
      'POST',
      `/api/v1/courses/${courseId}/meeting-notifications`,
      meetingPayload,
      teacherToken
    );
    log.debug(`Meeting notification status: ${meetingRes.status}`);
    log.debug(`Meeting notification response: ${JSON.stringify(meetingRes.body, null, 2)}`);

    if (meetingRes.status === 201) {
      log.success('Meeting notification created successfully');
    } else {
      log.error(`Meeting notification creation failed with status ${meetingRes.status}`);
      log.error(`Full response: ${JSON.stringify(meetingRes.body || meetingRes.rawBody, null, 2)}`);
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
  }
};

runDebug();
