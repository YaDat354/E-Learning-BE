-- Migration 004: add payment order tracking for gateway checkout flow

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(120) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_title VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  gateway VARCHAR(30) NOT NULL DEFAULT 'vnpay',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  customer_name VARCHAR(150),
  customer_email VARCHAR(255),
  return_url TEXT,
  callback_url TEXT,
  request_id VARCHAR(120),
  partner_code VARCHAR(120),
  payment_url TEXT,
  gateway_trans_id VARCHAR(120),
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_orders_amount_positive') THEN
    ALTER TABLE payment_orders
      ADD CONSTRAINT chk_payment_orders_amount_positive CHECK (amount > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_orders_status') THEN
    ALTER TABLE payment_orders
      ADD CONSTRAINT chk_payment_orders_status CHECK (status IN ('pending', 'paid', 'failed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_course_id ON payment_orders (course_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders (created_at DESC);
