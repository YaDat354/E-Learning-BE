# API Contract — E-Learning Backend v1

> **Target audience:** Frontend (web) and mobile developers.  
> Base URL: `http://localhost:3000` (local) — replace with production URL when deployed.  
> All request and response bodies use **JSON** (`Content-Type: application/json`).

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Get the token from `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.  
Tokens expire after `1d` by default (configurable via `JWT_EXPIRES_IN`).

---

## Response Envelope

Every response follows this consistent shape:

**Success**
```json
{
  "success": true,
  "data": { ... }   // object or array
}
```

**Error**
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## Shared Types

### `User`
```ts
{
  id:        string   // UUID
  fullName:  string
  email:     string   // unique
  role:      "student" | "teacher" | "admin"
  createdAt: string   // ISO 8601 datetime
}
```

### `Course`
```ts
{
  id:          string        // UUID
  title:       string
  description: string | null
  thumbnail:   string | null // URL
  teacherId:   string        // UUID of the teacher who created it
  createdAt:   string        // ISO 8601 datetime
}
```

### `Enrollment`
```ts
{
  id:          string  // UUID
  studentId:   string  // UUID
  courseId:    string  // UUID
  enrolledAt:  string  // ISO 8601 datetime
  courseTitle: string  // denormalized for convenience
}
```

---

## Endpoints

---

### System

#### `GET /health`
Health check — no auth required.

**Response 200**
```json
{ "success": true, "message": "E-Learning Backend Running" }
```

---

### Auth

#### `POST /api/v1/auth/register`

Create a new account.

| | |
|---|---|
| Auth | None |
| Rate limit | 20 req / 15 min per IP |

**Request body**
```json
{
  "fullName": "Nguyen Van A",       // required
  "email":    "user@example.com",   // required, unique
  "password": "password123",        // required, min 6 chars
  "role":     "student"             // optional: "student" | "teacher" | "admin" (default: "student")
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "email": "user@example.com",
      "role": "student",
      "createdAt": "2026-05-07T10:00:00.000Z"
    }
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 409    | Email already registered |
| 429    | Rate limit exceeded |

---

#### `POST /api/v1/auth/login`

Authenticate with email + password.

| | |
|---|---|
| Auth | None |
| Rate limit | 20 req / 15 min per IP |

**Request body**
```json
{
  "email":    "user@example.com",
  "password": "password123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "email": "user@example.com",
      "role": "student",
      "createdAt": "2026-05-07T10:00:00.000Z"
    }
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 401    | Wrong email or password |
| 429    | Rate limit exceeded |

---

### Users

#### `GET /api/v1/users/me`

Return the profile of the currently logged-in user.

| | |
|---|---|
| Auth | Bearer JWT (any role) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Nguyen Van A",
    "email": "user@example.com",
    "role": "student",
    "createdAt": "2026-05-07T10:00:00.000Z"
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 401    | Token missing, malformed, or expired |

---

### Courses

#### `GET /api/v1/courses`

List all courses. No auth required — public endpoint.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Node.js For Beginners",
      "description": "Learn Node.js from scratch",
      "thumbnail": "https://example.com/thumb.jpg",
      "teacherId": "uuid",
      "createdAt": "2026-05-07T10:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/v1/courses/:courseId`

Get a single course by UUID.

| | |
|---|---|
| Auth | None |

**Path parameter**
| Param | Type | Description |
|-------|------|-------------|
| `courseId` | UUID string | Course identifier |

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Node.js For Beginners",
    "description": "Learn Node.js from scratch",
    "thumbnail": "https://example.com/thumb.jpg",
    "teacherId": "uuid",
    "createdAt": "2026-05-07T10:00:00.000Z"
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 404    | Course with this ID does not exist |

---

#### `POST /api/v1/courses`

Create a new course.

| | |
|---|---|
| Auth | Bearer JWT |
| Required role | `teacher` or `admin` |

**Request body**
```json
{
  "title":       "Node.js For Beginners",   // required
  "description": "Learn Node.js from scratch", // optional
  "thumbnail":   "https://example.com/thumb.jpg" // optional, URL
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Node.js For Beginners",
    "description": "Learn Node.js from scratch",
    "thumbnail": "https://example.com/thumb.jpg",
    "teacherId": "uuid-of-the-teacher",
    "createdAt": "2026-05-07T10:00:00.000Z"
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 401    | Token missing or invalid |
| 403    | User is not teacher or admin |

---

### Enrollments

#### `POST /api/v1/enrollments`

Enroll the current student in a course.

| | |
|---|---|
| Auth | Bearer JWT |
| Required role | `student` |

**Request body**
```json
{
  "courseId": "uuid-of-the-course"   // required
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "studentId": "uuid",
    "courseId": "uuid",
    "enrolledAt": "2026-05-07T10:00:00.000Z",
    "courseTitle": "Node.js For Beginners"
  }
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 401    | Token missing or invalid |
| 403    | Authenticated user is not a student |
| 409    | Student is already enrolled in this course |

---

#### `GET /api/v1/enrollments/me`

List all courses the current student is enrolled in.

| | |
|---|---|
| Auth | Bearer JWT |
| Required role | `student` (or any authenticated user — returns their own enrollments) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "courseId": "uuid",
      "enrolledAt": "2026-05-07T10:00:00.000Z",
      "courseTitle": "Node.js For Beginners"
    }
  ]
}
```

**Errors**
| Status | Condition |
|--------|-----------|
| 401    | Token missing or invalid |

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request — malformed JSON or missing required field |
| 401 | Unauthorized — token missing, expired, or invalid |
| 403 | Forbidden — authenticated but insufficient role |
| 404 | Resource not found |
| 409 | Conflict — duplicate (email, enrollment) |
| 422 | Unprocessable entity — validation failed |
| 429 | Too many requests — rate limit |
| 500 | Internal server error |

---

## Interactive Docs

Open **http://localhost:3000/api-docs** in your browser for live Swagger UI where you can try every endpoint directly.

To authenticate in Swagger UI:
1. Call `POST /api/v1/auth/login` → copy `data.accessToken`
2. Click **Authorize** (top right lock icon)
3. Paste the token → **Authorize**
