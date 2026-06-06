-- Migration 006: seed realistic course prices in VND (multiples of 100,000)

WITH ranked_courses AS (
  SELECT
    id,
    level,
    ROW_NUMBER() OVER (PARTITION BY level ORDER BY created_at, id) AS rn
  FROM courses
)
UPDATE courses c
SET
  price = CASE rc.level
    WHEN 'co_ban' THEN (3 + ((rc.rn - 1) % 6)) * 100000
    WHEN 'trung_cap' THEN (6 + ((rc.rn - 1) % 7)) * 100000
    WHEN 'cao_cap' THEN (10 + ((rc.rn - 1) % 9)) * 100000
    ELSE (5 + ((rc.rn - 1) % 5)) * 100000
  END,
  original_price = CASE rc.level
    WHEN 'co_ban' THEN ((3 + ((rc.rn - 1) % 6)) + 2) * 100000
    WHEN 'trung_cap' THEN ((6 + ((rc.rn - 1) % 7)) + 2) * 100000
    WHEN 'cao_cap' THEN ((10 + ((rc.rn - 1) % 9)) + 3) * 100000
    ELSE ((5 + ((rc.rn - 1) % 5)) + 2) * 100000
  END,
  updated_at = NOW()
FROM ranked_courses rc
WHERE c.id = rc.id;
