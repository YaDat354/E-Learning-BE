# 01 - MVP Scope (Use Case to API)

Muc tieu: chot pham vi backend v1 de giao cho frontend va test end-to-end.

## 1. Vai tro he thong
- Guest
- Student
- Teacher
- Admin

## 2. Nhom chuc nang MVP bat buoc

### 2.1 Authentication va User
- Dang ky, dang nhap, quen mat khau (phase 2 co the bo quen mat khau neu can release nhanh)
- Lay profile, cap nhat profile (fullName, avatar)
- Phan quyen theo role: `student`, `teacher`, `admin`

### 2.2 Course va Enrollment
- Guest xem danh sach khoa hoc, xem chi tiet khoa hoc
- Student dang ky khoa hoc
- Student xem tien do hoc
- Teacher tao/sua/xoa khoa hoc cua minh
- Admin xem quan ly tat ca khoa hoc

### 2.3 Lesson, Files, Learning Log
- Teacher quan ly bai hoc (CRUD + thu tu bai hoc)
- Student hoc bai, xem tai lieu dinh kem
- Ghi learning log: thoi gian hoc, lan truy cap cuoi

### 2.4 Assignment va Submission
- Teacher tao/sua/xoa bai tap
- Student nop bai
- Teacher xem bai nop, cham diem, feedback
- Student xem ket qua bai nop

### 2.5 Quiz
- Teacher tao quiz, cau hoi, dap an
- Student lam quiz, nop bai
- Luu ket qua quiz va dap an da chon
- Student xem ket qua quiz

### 2.6 Discussion va Notification
- Student/Teacher tham gia thao luan theo course
- Ho tro reply theo parentId
- Gui thong bao den user (admin/teacher)
- User danh dau thong bao da doc

### 2.7 Bao cao co ban
- Teacher xem bao cao hoc tap theo khoa hoc
- Admin xem thong ke tong quan he thong

## 3. Out of Scope cho v1 (de tranh no scope)
- Thanh toan
- Livestream/video conference
- De xuat khoa hoc bang AI
- Realtime chat 1-1
- Multi-tenant

## 4. Danh sach API toi thieu cho v1

### Auth
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/forgot-password` (optional)
- GET `/api/v1/users/me`
- PATCH `/api/v1/users/me`

### Courses
- GET `/api/v1/courses`
- GET `/api/v1/courses/:courseId`
- POST `/api/v1/courses` (teacher/admin)
- PATCH `/api/v1/courses/:courseId` (owner/admin)
- DELETE `/api/v1/courses/:courseId` (owner/admin)

### Enrollments
- POST `/api/v1/enrollments`
- GET `/api/v1/enrollments/me`
- PATCH `/api/v1/enrollments/:enrollmentId/progress`

### Lessons & Files
- GET `/api/v1/courses/:courseId/lessons`
- POST `/api/v1/courses/:courseId/lessons` (teacher/admin)
- PATCH `/api/v1/lessons/:lessonId`
- DELETE `/api/v1/lessons/:lessonId`
- GET `/api/v1/lessons/:lessonId/files`
- POST `/api/v1/lessons/:lessonId/files`

### Assignments & Submissions
- GET `/api/v1/lessons/:lessonId/assignments`
- POST `/api/v1/lessons/:lessonId/assignments`
- POST `/api/v1/assignments/:assignmentId/submissions`
- GET `/api/v1/assignments/:assignmentId/submissions`
- PATCH `/api/v1/submissions/:submissionId/grade`

### Quizzes
- GET `/api/v1/lessons/:lessonId/quizzes`
- POST `/api/v1/lessons/:lessonId/quizzes`
- POST `/api/v1/quizzes/:quizId/submit`
- GET `/api/v1/quizzes/:quizId/results/me`

### Discussions
- GET `/api/v1/courses/:courseId/discussions`
- POST `/api/v1/courses/:courseId/discussions`

### Notifications
- GET `/api/v1/notifications/me`
- PATCH `/api/v1/notifications/:notificationId/read`

## 5. Definition of Done cho pham vi MVP
- Moi endpoint trong danh sach co controller + service + validation
- Co auth middleware va role middleware
- Co test integration cho cac luong quan trong (auth, enroll, submit quiz, grade)
- Swagger mo ta day du request/response/error
