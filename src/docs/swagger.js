const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'E-Learning Backend API',
    version: '1.0.0',
    description:
      'REST API for E-Learning platform. Authentication uses **Bearer JWT** tokens.\n\n' +
      '**How to authenticate:**\n' +
      '1. Call `POST /api/v1/auth/login` to get a token.\n' +
      '2. Click the **Authorize** button (top right) and enter: `<your_token>`.',
    contact: { name: 'E-Learning Team' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local dev' },
  ],
  tags: [
    { name: 'System',      description: 'Health & meta' },
    { name: 'Auth',        description: 'Register & login' },
    { name: 'Users',       description: 'Current user profile' },
    { name: 'Courses',     description: 'Course catalogue & creation' },
    { name: 'Enrollments', description: 'Student course enrollment' },
    { name: 'Lessons',     description: 'Lesson management in course' },
    { name: 'Assignments', description: 'Assignments and submissions' },
    { name: 'Quizzes',     description: 'Quizzes, questions, results' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT access token returned by /auth/login',
      },
    },
    schemas: {
      // ── Requests ────────────────────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Nguyen Van A' },
          email:    { type: 'string', format: 'email', example: 'student@example.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
          role:     { type: 'string', enum: ['student', 'teacher', 'admin'], default: 'student' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', example: 'student@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      CreateCourseRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title:       { type: 'string', example: 'English Communication Basics' },
          description: { type: 'string', example: 'Build speaking confidence for daily situations' },
          thumbnail:   { type: 'string', format: 'uri', example: 'https://example.com/thumb.jpg' },
        },
      },
      EnrollRequest: {
        type: 'object',
        required: ['courseId'],
        properties: {
          courseId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        },
      },
      // ── Responses ───────────────────────────────────────────
      UserObject: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          fullName:  { type: 'string' },
          email:     { type: 'string', format: 'email' },
          role:      { type: 'string', enum: ['student', 'teacher', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CourseObject: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          title:       { type: 'string' },
          description: { type: 'string', nullable: true },
          thumbnail:   { type: 'string', nullable: true },
          teacherId:   { type: 'string', format: 'uuid' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      EnrollmentObject: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          studentId:   { type: 'string', format: 'uuid' },
          courseId:    { type: 'string', format: 'uuid' },
          enrolledAt:  { type: 'string', format: 'date-time' },
          courseTitle: { type: 'string' },
        },
      },
      // ── Standard envelopes ───────────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
    },
  },
  paths: {
    // ── System ──────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns 200 when server is running.',
        responses: {
          200: {
            description: 'Server healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'E-Learning Backend Running' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        description: 'Creates a user. Default role is `student` if not supplied.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string', example: 'eyJhbGci...' },
                        user: { $ref: '#/components/schemas/UserObject' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          422: {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string', example: 'eyJhbGci...' },
                        user: { $ref: '#/components/schemas/UserObject' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid email or password',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          429: {
            description: 'Too many login attempts (rate limited)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    // ── Users ───────────────────────────────────────────────────
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UserObject' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update current user profile',
        description: 'Updates fullName and/or avatar for authenticated user.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string', example: 'Student Demo Updated' },
                  avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          400: {
            description: 'No update fields provided',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: {
            description: 'Missing or invalid token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    // ── Courses ─────────────────────────────────────────────────
    '/api/v1/courses': {
      get: {
        tags: ['Courses'],
        summary: 'List all published courses',
        description: 'Public endpoint — no auth required.',
        responses: {
          200: {
            description: 'Array of courses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CourseObject' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create a course',
        description: 'Requires role `teacher` or `admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCourseRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Course created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CourseObject' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          403: {
            description: 'Forbidden — only teacher/admin',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/courses/{courseId}': {
      get: {
        tags: ['Courses'],
        summary: 'Get course by ID',
        parameters: [
          {
            in: 'path',
            name: 'courseId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID of the course',
          },
        ],
        responses: {
          200: {
            description: 'Course details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CourseObject' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Course not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Courses'],
        summary: 'Update a course',
        description: 'Requires role teacher/admin. Teacher can only update own course.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'courseId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Updated Course Title' },
                  description: { type: 'string', example: 'Updated description' },
                  thumbnail: { type: 'string', example: 'https://example.com/new-thumb.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Course updated' },
          400: { description: 'No update fields provided' },
          403: { description: 'Forbidden' },
          404: { description: 'Course not found' },
        },
      },
      delete: {
        tags: ['Courses'],
        summary: 'Delete a course',
        description: 'Requires role teacher/admin. Teacher can only delete own course.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'courseId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Course deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'Course not found' },
        },
      },
    },

    // ── Enrollments ─────────────────────────────────────────────
    '/api/v1/enrollments': {
      post: {
        tags: ['Enrollments'],
        summary: 'Enroll in a course',
        description: 'Requires role `student`. A student can only enroll once per course.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EnrollRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Enrollment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/EnrollmentObject' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Only students can enroll',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          409: {
            description: 'Already enrolled in this course',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/enrollments/me': {
      get: {
        tags: ['Enrollments'],
        summary: 'List my enrollments',
        description: 'Returns all courses the authenticated student is enrolled in.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Enrollment list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/EnrollmentObject' },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/enrollments/{enrollmentId}/progress': {
      patch: {
        tags: ['Enrollments'],
        summary: 'Update enrollment progress',
        description: 'Student can update own enrollment progress. Admin can update any.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'enrollmentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['progress'],
                properties: {
                  progress: { type: 'number', minimum: 0, maximum: 100, example: 45 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Progress updated' },
          400: { description: 'Invalid progress value' },
          403: { description: 'Forbidden' },
          404: { description: 'Enrollment not found' },
        },
      },
    },

    // ── Lessons ─────────────────────────────────────────────────
    '/api/v1/courses/{courseId}/lessons': {
      get: {
        tags: ['Lessons'],
        summary: 'List lessons by course',
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Lesson list' } },
      },
      post: {
        tags: ['Lessons'],
        summary: 'Create lesson (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Lesson created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/v1/courses/{courseId}/lessons/{lessonId}': {
      get: {
        tags: ['Lessons'],
        summary: 'Get lesson details',
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'lessonId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Lesson details' } },
      },
      patch: {
        tags: ['Lessons'],
        summary: 'Update lesson (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'lessonId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Lesson updated' }, 403: { description: 'Forbidden' } },
      },
      delete: {
        tags: ['Lessons'],
        summary: 'Delete lesson (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'lessonId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Lesson deleted' }, 403: { description: 'Forbidden' } },
      },
    },

    // ── Assignments ─────────────────────────────────────────────
    '/api/v1/courses/{courseId}/assignments': {
      get: {
        tags: ['Assignments'],
        summary: 'List assignments by course',
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Assignment list' } },
      },
      post: {
        tags: ['Assignments'],
        summary: 'Create assignment (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Assignment created' } },
      },
    },
    '/api/v1/courses/{courseId}/assignments/{assignmentId}': {
      get: {
        tags: ['Assignments'],
        summary: 'Get assignment by id',
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Assignment detail' } },
      },
      patch: {
        tags: ['Assignments'],
        summary: 'Update assignment (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Assignment updated' } },
      },
      delete: {
        tags: ['Assignments'],
        summary: 'Delete assignment (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Assignment deleted' } },
      },
    },
    '/api/v1/courses/{courseId}/assignments/{assignmentId}/submissions': {
      post: {
        tags: ['Assignments'],
        summary: 'Submit assignment (student)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 201: { description: 'Submission created' }, 409: { description: 'Already submitted' } },
      },
      get: {
        tags: ['Assignments'],
        summary: 'List submissions for assignment (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Submission list' } },
      },
    },
    '/api/v1/courses/{courseId}/assignments/{assignmentId}/submissions/{submissionId}/grade': {
      patch: {
        tags: ['Assignments'],
        summary: 'Grade submission (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'assignmentId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'submissionId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Submission graded' } },
      },
    },
    '/api/v1/submissions/me': {
      get: {
        tags: ['Assignments'],
        summary: 'List my submissions',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'My submissions' } },
      },
    },

    // ── Quizzes ─────────────────────────────────────────────────
    '/api/v1/courses/{courseId}/quizzes': {
      get: {
        tags: ['Quizzes'],
        summary: 'List quizzes by course',
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Quiz list' } },
      },
      post: {
        tags: ['Quizzes'],
        summary: 'Create quiz (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Quiz created' } },
      },
    },
    '/api/v1/courses/{courseId}/quizzes/{quizId}': {
      get: {
        tags: ['Quizzes'],
        summary: 'Get quiz detail with questions',
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'quizId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Quiz detail' } },
      },
    },
    '/api/v1/courses/{courseId}/quizzes/{quizId}/questions': {
      post: {
        tags: ['Quizzes'],
        summary: 'Add question to quiz (teacher/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'quizId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 201: { description: 'Question created' } },
      },
    },
    '/api/v1/courses/{courseId}/quizzes/{quizId}/submit': {
      post: {
        tags: ['Quizzes'],
        summary: 'Submit quiz (student)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'courseId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'quizId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 201: { description: 'Quiz submitted' }, 409: { description: 'Already submitted' } },
      },
    },
    '/api/v1/quiz-results/me': {
      get: {
        tags: ['Quizzes'],
        summary: 'List my quiz results',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Result list' } },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [],
};

module.exports = swaggerJsdoc(options);
