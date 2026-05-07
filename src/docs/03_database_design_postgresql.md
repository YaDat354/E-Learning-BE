# 03 - Database Design (PostgreSQL)

File migration chinh: `src/database/migrations/001_init_elearning_schema.sql`

## 1. Quy uoc dat ten
- Bang va cot dung `snake_case` de phu hop PostgreSQL.
- Tuong ung voi ERD camelCase:
  - `fullName -> full_name`
  - `roleId -> role_id`
  - `teacherId -> teacher_id`
  - `videoUrl -> video_url`
  - `orderIndex -> order_index`
  - `dueDate -> due_date`
  - `submittedAt -> submitted_at`
  - `isCorrect -> is_correct`
  - `quizResultId -> quiz_result_id`
  - `parentId -> parent_id`
  - `fileName -> file_name`
  - `fileUrl -> file_url`
  - `isRead -> is_read`
  - `lastAccess -> last_access`

## 2. Kieu du lieu chinh
- ID: `UUID` + default `gen_random_uuid()`
- Thoi gian: `TIMESTAMPTZ`
- Noi dung dai: `TEXT`
- Diem va tien do: `NUMERIC(5,2)`
- Trang thai logic: `BOOLEAN`

## 3. Ranh buoc da ap dung
- Unique:
  - `roles.name`
  - `users.email`
  - `enrollments(student_id, course_id)`
  - `submissions(assignment_id, student_id)`
  - `quiz_results(quiz_id, student_id)`
  - `learning_logs(student_id, lesson_id)`
  - `lessons(course_id, order_index)`
- Check:
  - `progress` tu 0..100
  - `score` tu 0..100
  - `duration >= 0`
  - `time_limit > 0` neu co
  - `questions.type` thuoc `single_choice | multiple_choice | text`
- Foreign key theo dung ERD va co chinh sach `ON DELETE` hop ly.

## 4. Index da tao
- Index cho cac truong truy van cao: teacher_id, course_id, lesson_id, assignment_id, student_id...
- Index ket hop thong bao: `(user_id, is_read)`

## 5. Seed du lieu role
- Da seed 3 role mac dinh:
  - `student`
  - `teacher`
  - `admin`

## 6. Cach chay migration
Chay truc tiep bang `psql`:

```bash
psql "postgresql://<user>:<password>@<host>:<port>/<db_name>" -f src/database/migrations/001_init_elearning_schema.sql
```

Vi du local:

```bash
psql "postgresql://postgres:123456@localhost:5432/e_learning" -f src/database/migrations/001_init_elearning_schema.sql
```

Neu ban da tao schema toi gian (users/courses/lessons/enrollments) nhu doan SQL ban gui, hay chay file nang cap:

```bash
psql "postgresql://<user>:<password>@<host>:<port>/<db_name>" -f src/database/migrations/002_upgrade_from_basic_schema.sql
```

Tom tat thu tu:
- DB moi hoan toan: chay `001_init_elearning_schema.sql`
- DB da co 4 bang co ban: chay `002_upgrade_from_basic_schema.sql`

## 7. Luu y ky thuat quan trong
- Bang `quiz_results` dang de unique `(quiz_id, student_id)`, tuc la moi hoc vien chi co 1 lan nop/quiz.
- Neu ban muon nhieu lan thi can bo unique nay va them cot `attempt_no`.
- Bang `student_answers` hien bat buoc `answer_id`, phu hop choice question; neu muon ho tro cau tu luan can them cot `text_answer`.
