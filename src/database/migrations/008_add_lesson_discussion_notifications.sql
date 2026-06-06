-- Migration 008: lesson-level discussion comments and unread tracking per user

ALTER TABLE discussions
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE discussions
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_discussions_lesson_id_created_at
  ON discussions (lesson_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lesson_comment_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
  last_seen_comment_id UUID REFERENCES discussions(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_comment_reads_lesson_id
  ON lesson_comment_reads (lesson_id);