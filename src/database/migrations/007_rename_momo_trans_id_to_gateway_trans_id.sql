-- Migration 007: remove MoMo-specific transaction column naming

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_orders' AND column_name = 'momo_trans_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_orders' AND column_name = 'gateway_trans_id'
  ) THEN
    ALTER TABLE payment_orders RENAME COLUMN momo_trans_id TO gateway_trans_id;
  END IF;
END $$;

ALTER TABLE payment_orders
  ALTER COLUMN gateway SET DEFAULT 'vnpay';
