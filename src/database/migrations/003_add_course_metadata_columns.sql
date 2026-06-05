-- Migration 003: add teacher-facing course metadata fields

ALTER TABLE courses ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_price_non_negative') THEN
    ALTER TABLE courses
      ADD CONSTRAINT chk_courses_price_non_negative
      CHECK (price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_original_price_non_negative') THEN
    ALTER TABLE courses
      ADD CONSTRAINT chk_courses_original_price_non_negative
      CHECK (original_price IS NULL OR original_price >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_courses_duration_non_negative') THEN
    ALTER TABLE courses
      ADD CONSTRAINT chk_courses_duration_non_negative
      CHECK (duration IS NULL OR duration >= 0);
  END IF;
END $$;
