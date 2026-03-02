-- ============================================================
-- SALON SAAS - PRODUCTION SCHEMA v2
-- Full rewrite: Soft Deletes, Strict RLS, RPCs, Triggers
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for EXCLUDE constraints

-- ============================================================
-- HELPER FUNCTION: Get current user role from profiles
-- Used by RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id          uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email       text UNIQUE,
  first_name  text,
  last_name   text,
  role        text CHECK (role IN ('admin', 'manager', 'staff', 'receptionist')),
  avatar_url  text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Clients
CREATE TABLE clients (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  phone           text,
  email           text,
  birth_date      date,
  notes           text,
  loyalty_points  integer DEFAULT 0,
  tier            text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_spent     numeric DEFAULT 0,
  visit_count     integer DEFAULT 0,
  last_visit      timestamptz,
  credit_balance  numeric DEFAULT 0,
  preferred_staff uuid,
  is_deleted      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

-- Staff
CREATE TABLE staff (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  phone           text,
  email           text UNIQUE,
  specialties     text[],
  commission_rate numeric DEFAULT 0,
  base_salary     numeric DEFAULT 0,
  salary_type     text DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'commission', 'hourly')),
  hire_date       date DEFAULT CURRENT_DATE,
  is_active       boolean DEFAULT true,
  is_deleted      boolean DEFAULT false,
  working_hours   jsonb,
  avatar_url      text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Services
CREATE TABLE services (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ar         text NOT NULL,
  name_fr         text NOT NULL,
  category        text NOT NULL,
  price           numeric NOT NULL CHECK (price >= 0),
  duration        integer NOT NULL CHECK (duration > 0),
  description_ar  text,
  description_fr  text,
  color           text,
  is_active       boolean DEFAULT true,
  is_deleted      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Appointments
CREATE TABLE appointments (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  staff_id      uuid REFERENCES staff(id) ON DELETE SET NULL,
  date          date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  status        text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')),
  notes         text,
  total_amount  numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  -- Prevent double-booking: same staff cannot have overlapping appointments
  EXCLUDE USING GIST (
    staff_id WITH =,
    date WITH =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) WITH &&
  ) WHERE (status NOT IN ('cancelled', 'no-show') AND staff_id IS NOT NULL)
);

-- Appointment Services (join table — price snapshot preserved)
CREATE TABLE appointment_services (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id   uuid REFERENCES appointments(id) ON DELETE CASCADE,
  service_id       uuid REFERENCES services(id) ON DELETE RESTRICT,
  price_at_booking numeric NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- Products (Retail)
CREATE TABLE products (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ar      text NOT NULL,
  name_fr      text NOT NULL,
  category     text,
  price        numeric NOT NULL CHECK (price >= 0),
  stock        integer DEFAULT 0 CHECK (stock >= 0),
  min_stock    integer DEFAULT 5,
  expiry_date  date,
  is_deleted   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Inventory Items (Internal Use)
CREATE TABLE inventory_items (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ar      text NOT NULL,
  name_fr      text NOT NULL,
  category     text,
  quantity     numeric DEFAULT 0,
  unit         text,
  min_stock    numeric DEFAULT 5,
  max_stock    numeric,
  supplier     text,
  expiry_date  date,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Transactions (header)
CREATE TABLE transactions (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  staff_id        uuid REFERENCES staff(id) ON DELETE SET NULL,
  subtotal        numeric DEFAULT 0,
  discount        numeric DEFAULT 0,
  tax             numeric DEFAULT 0,
  total           numeric DEFAULT 0,
  payment_method  text CHECK (payment_method IN ('cash', 'card', 'split', 'loyalty')),
  payment_status  text DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Transaction Items (snapshot of names and prices at time of sale)
CREATE TABLE transaction_items (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id  uuid REFERENCES transactions(id) ON DELETE CASCADE,
  item_type       text CHECK (item_type IN ('service', 'product')),
  item_id         uuid,
  name_ar         text,
  name_fr         text,
  quantity        integer DEFAULT 1,
  unit_price      numeric NOT NULL,
  total           numeric NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Client Payments (credits / debits on client account)
CREATE TABLE client_payments (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount        numeric NOT NULL,
  description   text,
  reference_id  uuid,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Staff Payments
CREATE TABLE staff_payments (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id      uuid REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL CHECK (type IN ('salary', 'commission', 'bonus', 'advance', 'deduction')),
  amount        numeric NOT NULL,
  description   text,
  reference_id  uuid,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Suppliers
CREATE TABLE suppliers (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            text NOT NULL,
  contact_person  text,
  phone           text,
  email           text,
  address         text,
  city            text,
  balance         numeric DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Supplier Payments
CREATE TABLE supplier_payments (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id     uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  amount          numeric NOT NULL,
  payment_date    date NOT NULL,
  payment_method  text,
  notes           text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date      date DEFAULT CURRENT_DATE,
  expected_date   date,
  received_date   date,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal        numeric DEFAULT 0,
  tax             numeric DEFAULT 0,
  total           numeric DEFAULT 0,
  notes           text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_order_id   uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id          uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity            integer NOT NULL,
  unit_price          numeric NOT NULL,
  total               numeric NOT NULL,
  created_at          timestamptz DEFAULT now() NOT NULL
);

-- Expenses
CREATE TABLE expenses (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text NOT NULL,
  amount      numeric NOT NULL CHECK (amount > 0),
  category    text,
  date        date DEFAULT CURRENT_DATE NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- WhatsApp Sessions
CREATE TABLE whatsapp_sessions (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number      text UNIQUE NOT NULL,
  client_id         uuid REFERENCES clients(id) ON DELETE SET NULL,
  last_messages     jsonb DEFAULT '[]'::jsonb,
  message_count     integer DEFAULT 0,
  last_interaction  timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- Chat Messages (internal AI assistant)
CREATE TABLE chat_messages (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- App Settings (key/value)
CREATE TABLE app_settings (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         text UNIQUE NOT NULL,
  value       jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Store Settings
CREATE TABLE store_settings (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          text,
  phone         text,
  email         text,
  address       text,
  logo_url      text,
  currency      text DEFAULT 'DZD',
  tax_rate      numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: auto-update clients.credit_balance when client_payments changes
CREATE OR REPLACE FUNCTION trg_update_credit_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE clients
    SET credit_balance = COALESCE((
      SELECT SUM(CASE WHEN type = 'credit' OR type = 'refund' THEN amount
                      WHEN type = 'debit' THEN -amount
                      ELSE 0 END)
      FROM client_payments WHERE client_id = OLD.client_id
    ), 0)
    WHERE id = OLD.client_id;
    RETURN OLD;
  ELSE
    UPDATE clients
    SET credit_balance = COALESCE((
      SELECT SUM(CASE WHEN type = 'credit' OR type = 'refund' THEN amount
                      WHEN type = 'debit' THEN -amount
                      ELSE 0 END)
      FROM client_payments WHERE client_id = NEW.client_id
    ), 0)
    WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_credit_balance
AFTER INSERT OR UPDATE OR DELETE ON client_payments
FOR EACH ROW EXECUTE FUNCTION trg_update_credit_balance();

-- ============================================================
-- RPCs (Stored Procedures)
-- ============================================================

-- RPC 1: Atomic transaction creation + stock deduction
-- Prevents partial inserts and race conditions on stock
CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_client_id       uuid,
  p_staff_id        uuid,
  p_subtotal        numeric,
  p_discount        numeric,
  p_tax             numeric,
  p_total           numeric,
  p_payment_method  text,
  p_items           jsonb   -- array of {item_type, item_id, name_ar, name_fr, quantity, unit_price, total}
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id     uuid;
  v_item      jsonb;
  v_new_stock integer;
BEGIN
  -- 1. Insert transaction header
  INSERT INTO transactions (client_id, staff_id, subtotal, discount, tax, total, payment_method, payment_status)
  VALUES (p_client_id, p_staff_id, p_subtotal, p_discount, p_tax, p_total, p_payment_method, 'paid')
  RETURNING id INTO v_tx_id;

  -- 2. Insert items + deduct stock atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO transaction_items (transaction_id, item_type, item_id, name_ar, name_fr, quantity, unit_price, total)
    VALUES (
      v_tx_id,
      v_item->>'item_type',
      (v_item->>'item_id')::uuid,
      v_item->>'name_ar',
      v_item->>'name_fr',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total')::numeric
    );

    -- Deduct stock only for products; enforce stock >= 0
    IF v_item->>'item_type' = 'product' AND (v_item->>'item_id') IS NOT NULL THEN
      UPDATE products
      SET stock = stock - (v_item->>'quantity')::integer
      WHERE id = (v_item->>'item_id')::uuid
        AND is_deleted = false;

      -- Verify stock didn't go negative
      SELECT stock INTO v_new_stock FROM products WHERE id = (v_item->>'item_id')::uuid;
      IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock insuffisant pour le produit %', (v_item->>'name_fr');
      END IF;
    END IF;
  END LOOP;

  RETURN v_tx_id;
END;
$$;

-- RPC 2: Atomic WhatsApp message append (prevents concurrent overwrite)
CREATE OR REPLACE FUNCTION append_whatsapp_message(
  p_phone      text,
  p_role       text,
  p_content    text,
  p_max_keep   integer DEFAULT 3
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_msg jsonb;
BEGIN
  v_new_msg := jsonb_build_object(
    'role', p_role,
    'content', p_content,
    'timestamp', now()::text
  );

  INSERT INTO whatsapp_sessions (phone_number, last_messages, message_count, last_interaction)
  VALUES (p_phone, jsonb_build_array(v_new_msg), 1, now())
  ON CONFLICT (phone_number) DO UPDATE
    SET last_messages    = (
          SELECT jsonb_agg(msg)
          FROM (
            SELECT msg FROM jsonb_array_elements(whatsapp_sessions.last_messages) AS msg
            UNION ALL
            SELECT v_new_msg
          ) sub
          -- Keep only last p_max_keep messages
          OFFSET GREATEST(0, (
            SELECT COUNT(*) FROM jsonb_array_elements(whatsapp_sessions.last_messages)
          ) + 1 - p_max_keep)
        ),
        message_count    = whatsapp_sessions.message_count + 1,
        last_interaction  = now();
END;
$$;

-- RPC 3: Atomic loyalty points + tier update
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_client_id   uuid,
  p_points      integer,
  p_amount_paid numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total   numeric;
  v_new_tier    text;
BEGIN
  UPDATE clients
  SET
    loyalty_points = loyalty_points + p_points,
    total_spent    = total_spent + p_amount_paid,
    visit_count    = visit_count + 1,
    last_visit     = now()
  WHERE id = p_client_id
  RETURNING total_spent INTO v_new_total;

  -- Recalculate tier
  v_new_tier := CASE
    WHEN v_new_total >= 200000 THEN 'platinum'
    WHEN v_new_total >= 100000 THEN 'gold'
    WHEN v_new_total >= 50000  THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE clients SET tier = v_new_tier WHERE id = p_client_id;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings     ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- Users can read their own profile; admin can read all
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Only admin can manage other profiles
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (get_user_role() = 'admin');

-- ---- clients ----
-- All authenticated users can read non-deleted clients
CREATE POLICY "clients_select" ON clients FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- All authenticated users can insert new clients
CREATE POLICY "clients_insert" ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update clients
CREATE POLICY "clients_update" ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- Only admin/manager can hard-delete (soft delete via update is above)
CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- staff ----
CREATE POLICY "staff_select" ON staff FOR SELECT
  TO authenticated
  USING (true); -- All can view staff (including deleted, for reports)

CREATE POLICY "staff_mutate" ON staff FOR INSERT
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "staff_update" ON staff FOR UPDATE
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "staff_delete" ON staff FOR DELETE
  USING (get_user_role() = 'admin');

-- ---- services ----
CREATE POLICY "services_select" ON services FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "services_mutate" ON services FOR INSERT
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "services_update" ON services FOR UPDATE
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "services_delete" ON services FOR DELETE
  USING (get_user_role() = 'admin');

-- ---- appointments ----
CREATE POLICY "appointments_all" ON appointments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- appointment_services ----
CREATE POLICY "appt_services_all" ON appointment_services FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- products ----
CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "products_mutate" ON products FOR INSERT
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "products_update" ON products FOR UPDATE
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "products_delete" ON products FOR DELETE
  USING (get_user_role() = 'admin');

-- ---- inventory_items ----
CREATE POLICY "inventory_all" ON inventory_items FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- transactions ----
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (get_user_role() = 'admin');

-- ---- transaction_items ----
CREATE POLICY "tx_items_all" ON transaction_items FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- client_payments ----
CREATE POLICY "client_payments_all" ON client_payments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- staff_payments ----
CREATE POLICY "staff_payments_all" ON staff_payments FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- suppliers ----
CREATE POLICY "suppliers_all" ON suppliers FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- supplier_payments ----
CREATE POLICY "supplier_payments_all" ON supplier_payments FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- purchase_orders ----
CREATE POLICY "purchase_orders_all" ON purchase_orders FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- purchase_order_items ----
CREATE POLICY "po_items_all" ON purchase_order_items FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- expenses ----
CREATE POLICY "expenses_all" ON expenses FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- whatsapp_sessions ----
CREATE POLICY "whatsapp_all" ON whatsapp_sessions FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- chat_messages ----
CREATE POLICY "chat_all" ON chat_messages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ---- app_settings ----
CREATE POLICY "settings_select" ON app_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "settings_mutate" ON app_settings FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));

-- ---- store_settings ----
CREATE POLICY "store_select" ON store_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "store_mutate" ON store_settings FOR ALL
  USING (get_user_role() IN ('admin', 'manager'));
