-- Migration 005: normalize course price columns for payment flows

-- Backfill existing rows so FE always receives a valid payable price.
UPDATE courses
SET price = 0
WHERE price IS NULL;

-- Ensure new rows always have a non-null price.
ALTER TABLE courses
  ALTER COLUMN price SET DEFAULT 0,
  ALTER COLUMN price SET NOT NULL;

-- Keep original_price optional, but remove accidental defaults if any.
ALTER TABLE courses
  ALTER COLUMN original_price DROP DEFAULT;
