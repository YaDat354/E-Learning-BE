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

# MoMo (sandbox)
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_REQUEST_TYPE=captureWallet
```

| Variable        | Required | Description                               |
|-----------------|----------|-------------------------------------------|
| `PORT`          | No       | HTTP port (default 3000)                  |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string              |
| `JWT_SECRET`    | Yes      | Secret for signing JWT tokens             |
| `JWT_EXPIRES_IN`| No       | Token expiry (default `1d`)               |
| `MOMO_ENDPOINT` | No       | MoMo create-payment endpoint (sandbox default) |
| `MOMO_PARTNER_CODE` | Yes (for payment) | MoMo partner code |
| `MOMO_ACCESS_KEY` | Yes (for payment) | MoMo access key |
| `MOMO_SECRET_KEY` | Yes (for payment) | MoMo secret key (used for signatures) |
| `MOMO_REQUEST_TYPE` | No | MoMo request type (default `captureWallet`) |

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
| POST   | /api/v1/courses             | Bearer JWT | teacher / admin |
| POST   | /api/v1/enrollments         | Bearer JWT | student         |
| GET    | /api/v1/enrollments/me      | Bearer JWT | student         |
| POST   | /api/v1/payments/momo/checkout | Bearer JWT | any authenticated |
| POST   | /api/v1/payments/momo/webhook | — | MoMo server |
| GET    | /api/v1/payments/:orderId/status | Optional Bearer JWT | order owner when logged in |

Full interactive docs: `GET /api-docs`

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
