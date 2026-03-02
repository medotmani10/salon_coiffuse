-- ============================================================
-- MIGRATION PATCH v2 — Apply on top of existing database
-- Run this in Supabase SQL Editor (safe, no data loss)
-- ============================================================

-- 1. Add soft-delete columns to existing tables
ALTER TABLE clients    ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE staff      ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE services   ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE products   ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 2. Add missing columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance  numeric DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_staff uuid;
ALTER TABLE staff   ADD COLUMN IF NOT EXISTS salary_type     text DEFAULT 'monthly';
ALTER TABLE staff   ADD COLUMN IF NOT EXISTS is_deleted      boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active      boolean DEFAULT true;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance       numeric DEFAULT 0;

-- 3. Add btree_gist extension for EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 4. Create missing tables (safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS client_payments (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount        numeric NOT NULL,
  description   text,
  reference_id  uuid,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_payments (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id      uuid REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL CHECK (type IN ('salary', 'commission', 'bonus', 'advance', 'deduction')),
  amount        numeric NOT NULL,
  description   text,
  reference_id  uuid,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id     uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  amount          numeric NOT NULL,
  payment_date    date NOT NULL,
  payment_method  text,
  notes           text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number      text UNIQUE NOT NULL,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  last_messages     jsonb DEFAULT '[]'::jsonb,
  message_count     integer DEFAULT 0,
  last_interaction  timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text NOT NULL,
  amount      numeric NOT NULL CHECK (amount > 0),
  category    text,
  date        date DEFAULT CURRENT_DATE NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         text UNIQUE NOT NULL,
  value       jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        text,
  phone       text,
  email       text,
  address     text,
  logo_url    text,
  currency    text DEFAULT 'DZD',
  tax_rate    numeric DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 5. Enable RLS on new tables
ALTER TABLE client_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings     ENABLE ROW LEVEL SECURITY;

-- 6. Open policies for new tables (same as existing dev setup)
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON client_payments   FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON staff_payments    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON supplier_payments FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON whatsapp_sessions FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON chat_messages     FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON expenses          FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON app_settings      FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access" ON store_settings    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Trigger: auto-update credit_balance on client_payments insert/update/delete
CREATE OR REPLACE FUNCTION trg_update_credit_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE clients SET credit_balance = COALESCE((
      SELECT SUM(CASE WHEN type IN ('credit','refund') THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END)
      FROM client_payments WHERE client_id = OLD.client_id
    ), 0) WHERE id = OLD.client_id;
    RETURN OLD;
  ELSE
    UPDATE clients SET credit_balance = COALESCE((
      SELECT SUM(CASE WHEN type IN ('credit','refund') THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END)
      FROM client_payments WHERE client_id = NEW.client_id
    ), 0) WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_balance ON client_payments;
CREATE TRIGGER trg_credit_balance
AFTER INSERT OR UPDATE OR DELETE ON client_payments
FOR EACH ROW EXECUTE FUNCTION trg_update_credit_balance();

-- 8. RPC: Atomic transaction creation + stock deduction
CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_client_id uuid, p_staff_id uuid,
  p_subtotal numeric, p_discount numeric, p_tax numeric, p_total numeric,
  p_payment_method text, p_items jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tx_id uuid; v_item jsonb; v_new_stock integer;
BEGIN
  INSERT INTO transactions (client_id, staff_id, subtotal, discount, tax, total, payment_method, payment_status)
  VALUES (p_client_id, p_staff_id, p_subtotal, p_discount, p_tax, p_total, p_payment_method, 'paid')
  RETURNING id INTO v_tx_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO transaction_items (transaction_id, item_type, item_id, name_ar, name_fr, quantity, unit_price, total)
    VALUES (v_tx_id, v_item->>'item_type', (v_item->>'item_id')::uuid, v_item->>'name_ar', v_item->>'name_fr',
            (v_item->>'quantity')::integer, (v_item->>'unit_price')::numeric, (v_item->>'total')::numeric);

    IF v_item->>'item_type' = 'product' AND (v_item->>'item_id') IS NOT NULL THEN
      UPDATE products SET stock = stock - (v_item->>'quantity')::integer
      WHERE id = (v_item->>'item_id')::uuid AND is_deleted = false;
      SELECT stock INTO v_new_stock FROM products WHERE id = (v_item->>'item_id')::uuid;
      IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock insuffisant pour le produit %', (v_item->>'name_fr');
      END IF;
    END IF;
  END LOOP;
  RETURN v_tx_id;
END;
$$;

-- 9. RPC: Atomic WhatsApp message append
CREATE OR REPLACE FUNCTION append_whatsapp_message(
  p_phone text, p_role text, p_content text, p_max_keep integer DEFAULT 3
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_msg jsonb;
BEGIN
  v_new_msg := jsonb_build_object('role', p_role, 'content', p_content, 'timestamp', now()::text);
  INSERT INTO whatsapp_sessions (phone_number, last_messages, message_count, last_interaction)
  VALUES (p_phone, jsonb_build_array(v_new_msg), 1, now())
  ON CONFLICT (phone_number) DO UPDATE SET
    last_messages     = (SELECT jsonb_agg(msg) FROM (
                           SELECT msg FROM jsonb_array_elements(whatsapp_sessions.last_messages) AS msg
                           UNION ALL SELECT v_new_msg
                         ) sub
                         OFFSET GREATEST(0, (SELECT COUNT(*) FROM jsonb_array_elements(whatsapp_sessions.last_messages)) + 1 - p_max_keep)),
    message_count     = whatsapp_sessions.message_count + 1,
    last_interaction  = now();
END;
$$;

-- 10. RPC: Atomic loyalty points update
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_client_id uuid, p_points integer, p_amount_paid numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_total numeric; v_new_tier text;
BEGIN
  UPDATE clients SET
    loyalty_points = loyalty_points + p_points,
    total_spent    = total_spent + p_amount_paid,
    visit_count    = visit_count + 1,
    last_visit     = now()
  WHERE id = p_client_id RETURNING total_spent INTO v_new_total;

  v_new_tier := CASE
    WHEN v_new_total >= 200000 THEN 'platinum'
    WHEN v_new_total >= 100000 THEN 'gold'
    WHEN v_new_total >= 50000  THEN 'silver'
    ELSE 'bronze'
  END;
  UPDATE clients SET tier = v_new_tier WHERE id = p_client_id;
END;
$$;
