CREATE TABLE IF NOT EXISTS meeting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  meeting_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_notification_id UUID NOT NULL REFERENCES meeting_notifications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_notification_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_notifications_course_id ON meeting_notifications(course_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_teacher_id ON meeting_notifications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notification_recipients_student_id ON meeting_notification_recipients(student_id);
