# 02 - Backend Architecture (Express + PostgreSQL)

## 1. Nguyen tac thiet ke
- Tach layer ro rang: `routes -> controllers -> services -> models -> database`.
- Controller khong chua business logic phuc tap.
- Service la noi xu ly nghiep vu va transaction.
- Model chi tap trung truy van SQL (hoac query builder/ORM).
- Tat ca loi di qua error middleware trung tam.

## 2. Cau truc thu muc de xuat (dua tren workspace hien tai)
- `src/app.js`: bootstrap app, global middleware, route root, error handler
- `src/config/`: env, db config, logger config
- `src/constants/`: role, status code, message key
- `src/controllers/`: nhan request, goi service, tra response
- `src/services/`: business logic + transaction
- `src/models/`: truy van du lieu theo bang
- `src/routes/v1/`: route tung module
- `src/middlewares/`: auth, role guard, validate, not-found, error handler
- `src/validations/`: schema validate cho request
- `src/utils/`: helper (hash password, jwt, pagination, response formatter)
- `src/database/migrations/`: SQL migration
- `src/database/seeds/`: seed du lieu mau
- `tests/`: unit + integration

## 3. Mapping module theo use case
- Auth module: register/login/me/reset password
- User module: profile, avatar, role view
- Course module: CRUD course, list/detail
- Enrollment module: enroll/progress
- Lesson module: CRUD lesson, order index
- Assignment module: CRUD assignment
- Submission module: submit/grade/result
- Quiz module: quiz/question/answer + submit result
- Discussion module: thread + reply
- Notification module: list/read
- Report module: teacher report + admin stats

## 4. Chuan response
- Success:
```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```
- Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

## 5. Chuan xu ly loi
- 400: validation error
- 401: unauthenticated
- 403: unauthorized
- 404: resource not found
- 409: conflict (email da ton tai, da enroll)
- 422: business rule invalid
- 500: internal server error

## 6. Security baseline
- Password hash bang bcrypt
- JWT access token + refresh token (neu can)
- Rate limit cho auth endpoints
- Helmet + CORS + request size limit
- SQL injection safe qua parameterized query

## 7. Logging va observability
- Log theo requestId
- Log cac su kien quan trong: login, enroll, submit, grade
- Co endpoint health check `/health`

## 8. Kiem thu
- Unit test: service logic tinh diem, progress
- Integration test: auth, enroll, submit assignment, submit quiz
- Nen dung test DB rieng cho CI
