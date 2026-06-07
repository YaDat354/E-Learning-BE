# E-Learning Backend API

REST API for an E-Learning platform built with **Node.js + Express + PostgreSQL**.

---

## Requirements

| Tool       | Version     |
|------------|-------------|
| Node.js    | 18+         |
| PostgreSQL  | 13+         |
| npm        | 9+          |

---

## Quick Start (Local)

```bash
# 1. Clone and install
git clone <repo-url>
cd E_Learning_BE
npm install

# 2. Create .env (see section below)
cp .env.example .env   # or create manually

# 3. Run DB migration
npm run db:sync

# 4. Start dev server
npm run dev
```

Server runs at **http://localhost:3000**  
Swagger UI at **http://localhost:3000/api-docs**

---

## Environment Variables

Create a `.env` file at the project root:

```env
# Server
PORT=3000

# PostgreSQL connection string
# Format: postgresql://<user>:<password>@<host>:<port>/<dbname>
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/elearning_db

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d

# CORS (comma-separated FE origins)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# OpenAI gateway for chatbot
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# VNPAY (sandbox)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_VERSION=2.1.0
VNPAY_COMMAND=pay
VNPAY_CURR_CODE=VND
VNPAY_LOCALE=vn
```

| Variable        | Required | Description                               |
|-----------------|----------|-------------------------------------------|
| `PORT`          | No       | HTTP port (default 3000)                  |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string              |
| `JWT_SECRET`    | Yes      | Secret for signing JWT tokens             |
| `JWT_EXPIRES_IN`| No       | Token expiry (default `1d`)               |
| `CORS_ORIGINS`  | No       | Comma-separated allowed frontend origins  |
| `OPENAI_API_KEY`| Yes (for chatbot) | API key used by BE gateway to call OpenAI |
| `OPENAI_MODEL`  | No       | OpenAI model name (default `gpt-4o-mini`) |
| `VNPAY_TMN_CODE` | Yes (for payment) | VNPAY terminal code |
| `VNPAY_HASH_SECRET` | Yes (for payment) | Secret key for VNPAY signature |
| `VNPAY_URL` | No | VNPAY payment URL (sandbox default) |
| `VNPAY_VERSION` | No | VNPAY API version (default `2.1.0`) |
| `VNPAY_COMMAND` | No | VNPAY command (default `pay`) |
| `VNPAY_CURR_CODE` | No | Currency code (default `VND`) |
| `VNPAY_LOCALE` | No | Payment locale (default `vn`) |

---

## NPM Scripts

| Command           | Description                                      |
|-------------------|--------------------------------------------------|
| `npm run dev`     | Start with nodemon (auto-reload)                 |
| `npm start`       | Start in production mode                         |
| `npm run db:check`| Test PostgreSQL connectivity                     |
| `npm run db:sync` | Run migration `001_sync_schema_for_current_code` |
| `npm run db:seed` | Seed sample data                                  |
| `npm run db:import-real` | Import real data from `data/real-data.json` |
| `npm run test:smoke` | Run smoke test (auth + course + enrollment)  |

---

## Database Migration

Migrations live in `src/database/migrations/`.

```bash
# Apply all pending migrations
npm run db:sync
```

The script `src/database/run-sql-file.js` executes SQL files directly against `DATABASE_URL`.  
Add new SQL files using the naming convention: `NNN_description.sql`.

---

## Project Structure

```
src/
├── app.js                   # Entry point — Express setup, middleware, routes
├── config/
│   ├── env.js               # Reads and validates .env
│   └── database.js          # pg Pool — query() and testConnection()
├── constants/
│   └── roles.js             # STUDENT | TEACHER | ADMIN
├── controllers/             # HTTP layer — parse req, call service, send res
├── services/                # Business logic
├── models/                  # DB queries (raw SQL with pg)
├── routes/v1/               # Express routers mounted at /api/v1
├── middlewares/
│   ├── auth.middleware.js   # authenticate — validates Bearer JWT
│   ├── role.middleware.js   # authorizeRoles(...roles)
│   └── error.middleware.js  # notFoundHandler, errorHandler
├── utils/
│   ├── http-error.js        # HttpError class
│   ├── async-handler.js     # Wraps async controllers
│   └── jwt.js               # signAccessToken, verifyAccessToken
├── docs/
│   └── swagger.js           # OpenAPI 3.0 spec
└── database/
    ├── run-sql-file.js
    └── migrations/
        └── 001_sync_schema_for_current_code.sql
```

---

## API Overview

| Method | Path                        | Auth       | Role            |
|--------|-----------------------------|------------|-----------------|
| GET    | /health                     | —          | —               |
| POST   | /api/v1/auth/register       | —          | —               |
| POST   | /api/v1/auth/login          | —          | —               |
| GET    | /api/v1/users/me            | Bearer JWT | any             |
| GET    | /api/v1/courses             | —          | —               |
| GET    | /api/v1/courses/:courseId   | —          | —               |
| POST   | /api/v1/chatbot/chat        | —          | —               |
| POST   | /api/v1/ai/chat             | —          | —               |
| POST   | /api/v1/assistant/chat      | —          | —               |
| POST   | /api/v1/courses             | Bearer JWT | teacher / admin |
| POST   | /api/v1/enrollments         | Bearer JWT | student         |
| GET    | /api/v1/enrollments/me      | Bearer JWT | student         |
| POST   | /api/v1/payments/vnpay/checkout | Bearer JWT | any authenticated |
| GET/POST | /api/v1/payments/vnpay/ipn | — | VNPAY server |
| GET    | /api/v1/payments/:orderId/status | Optional Bearer JWT | order owner when logged in |

Full interactive docs: `GET /api-docs`

### Chatbot Request/Response

Request body:

```json
{
    "message": "Giup minh luyen 5 cau giao tiep khi phong van",
    "conversationId": "optional-conversation-id",
    "history": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
    ]
}
```

Response body:

```json
{
    "success": true,
    "message": "Chat response generated",
    "reply": "Noi dung phan hoi tu AI",
    "conversationId": "conversation-id",
    "data": {
        "reply": "Noi dung phan hoi tu AI",
        "conversationId": "conversation-id"
    }
}
```

Security notes:
- Never expose `OPENAI_API_KEY` to FE.
- Chatbot endpoint is rate-limited.
- Basic prompt-injection patterns are blocked.
- Logging uses request id and metadata only (no full prompt body).

---

## Running Tests

```bash
# Smoke test — exercises the full auth + course + enrollment flow
npm run test:smoke
```

Expected output: `AUTH_TEACHER_OK`, `AUTH_STUDENT_OK`, `COURSE_CREATED_OK`, `ENROLLMENT_CREATED_OK`, `MY_ENROLLMENTS_OK`

---

## Import Real Data

1. Prepare your data payload at `data/real-data.json`.
2. Ensure DB schema is up-to-date:

```bash
npm run db:sync
```

3. Run import:

```bash
npm run db:import-real
```

Optional: import from a custom file path.

```bash
node src/scripts/import-real-data.js path/to/real-data.json
```

Note: `JWT_SECRET` must be a strong value (minimum 16 chars, not `change-me`).

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` on startup | Wrong DB host/port | Check `DATABASE_URL` in `.env` |
| `column "description" does not exist` | Schema out of date | Run `npm run db:sync` |
| `401 Unauthorized` | Token missing or expired | Re-login and use new token |
| `403 Forbidden` | Wrong role for endpoint | Use an account with the required role |
