CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar TEXT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

CREATE TABLE IF NOT EXISTS lesson_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  learning_time INTEGER NOT NULL DEFAULT 0,
  last_access TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  score NUMERIC(6,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit INTEGER CHECK (time_limit IS NULL OR time_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('single_choice', 'multiple_choice', 'text')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
  text_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility fixes for legacy schema variants

-- assignments: support old lesson_id model and backfill course_id for current BE
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'lesson_id'
  ) THEN
    UPDATE assignments a
    SET course_id = l.course_id
    FROM lessons l
    WHERE a.lesson_id = l.id
      AND a.course_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignments_course'
  ) THEN
    ALTER TABLE assignments
      ADD CONSTRAINT fk_assignments_course FOREIGN KEY (course_id)
      REFERENCES courses(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- quizzes: support old lesson_id model and backfill course_id for current BE
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quizzes' AND column_name = 'lesson_id'
  ) THEN
    UPDATE quizzes q
    SET course_id = l.course_id
    FROM lessons l
    WHERE q.lesson_id = l.id
      AND q.course_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_quizzes_course'
  ) THEN
    ALTER TABLE quizzes
      ADD CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id)
      REFERENCES courses(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- notifications: migrate from old `content` to `title` + `message`
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'content'
  ) THEN
    UPDATE notifications
    SET title = COALESCE(NULLIF(title, ''), 'Notification'),
        message = COALESCE(message, content)
    WHERE title IS NULL OR message IS NULL;
  ELSE
    UPDATE notifications
    SET title = COALESCE(NULLIF(title, ''), 'Notification'),
        message = COALESCE(message, '')
    WHERE title IS NULL OR message IS NULL;
  END IF;
END $$;

ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN message SET NOT NULL;

-- learning_logs: migrate from old `duration` to current `learning_time`
ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS learning_time INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'learning_logs' AND column_name = 'duration'
  ) THEN
    UPDATE learning_logs
    SET learning_time = COALESCE(duration, 0)
    WHERE learning_time IS NULL OR learning_time = 0;
  END IF;
END $$;

-- student_answers: answer_id must allow NULL for text questions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_answers' AND column_name = 'answer_id'
  ) THEN
    ALTER TABLE student_answers ALTER COLUMN answer_id DROP NOT NULL;
  END IF;
END $$;

-- submissions: BE allows content-only submission without file URL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE submissions ALTER COLUMN file_url DROP NOT NULL;
  END IF;
END $$;

-- questions: support legacy `question_type` column name
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type VARCHAR(30);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question_type'
  ) THEN
    UPDATE questions
    SET type = COALESCE(type, question_type)
    WHERE type IS NULL;
  END IF;
END $$;

UPDATE questions
SET type = 'single_choice'
WHERE type IS NULL;

ALTER TABLE questions ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_questions_type'
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT chk_questions_type CHECK (type IN ('single_choice', 'multiple_choice', 'text'));
  END IF;
END $$;

-- lesson files: import legacy data from `files` table when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'files'
  ) THEN
    INSERT INTO lesson_files (lesson_id, file_name, file_url, created_at)
    SELECT f.lesson_id, f.file_name, f.file_url, COALESCE(f.uploaded_at, NOW())
    FROM files f
    WHERE NOT EXISTS (
      SELECT 1
      FROM lesson_files lf
      WHERE lf.lesson_id = f.lesson_id AND lf.file_url = f.file_url
    );
  END IF;
END $$;

-- enforce NOT NULL for current BE after backfill
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM assignments WHERE course_id IS NULL) THEN
    ALTER TABLE assignments ALTER COLUMN course_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE course_id IS NULL) THEN
    ALTER TABLE quizzes ALTER COLUMN course_id SET NOT NULL;
  END IF;
END $$;

INSERT INTO roles(name) VALUES ('student'), ('teacher'), ('admin')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course_id ON discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, is_read);