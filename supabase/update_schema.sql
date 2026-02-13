-- Create suppliers table if not exists
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchase_orders table if not exists
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  supplier_id uuid references suppliers(id) on delete set null,
  order_date date default CURRENT_DATE,
  expected_date date,
  received_date date,
  status text default 'pending' check (status in ('pending', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create purchase_order_items table if not exists
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_order_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null,
  unit_price numeric not null,
  total numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create supplier_payments table if not exists
CREATE TABLE IF NOT EXISTS supplier_payments (
    id uuid default uuid_generate_v4() primary key,
    supplier_id uuid references suppliers(id) on delete set null,
    amount numeric not null,
    payment_date date default CURRENT_DATE,
    payment_method text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for payments
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- Create open policies for payments
DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_payments;
CREATE POLICY "Enable read access for all users" ON supplier_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_payments;
CREATE POLICY "Enable insert access for all users" ON supplier_payments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_payments;
CREATE POLICY "Enable update access for all users" ON supplier_payments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_payments;
CREATE POLICY "Enable delete access for all users" ON supplier_payments FOR DELETE USING (true);

-- Add supplier_id to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
        ALTER TABLE products ADD COLUMN supplier_id uuid references suppliers(id) on delete set null;
    END IF;
END $$;

-- Add balance to suppliers if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'balance') THEN
        ALTER TABLE suppliers ADD COLUMN balance numeric default 0;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create open policies (idempotent via DROP IF EXISTS)
DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
CREATE POLICY "Enable read access for all users" ON suppliers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON suppliers;
CREATE POLICY "Enable insert access for all users" ON suppliers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON suppliers;
CREATE POLICY "Enable update access for all users" ON suppliers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON suppliers;
CREATE POLICY "Enable delete access for all users" ON suppliers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_orders;
CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_orders;
CREATE POLICY "Enable insert access for all users" ON purchase_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_orders;
CREATE POLICY "Enable update access for all users" ON purchase_orders FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_orders;
CREATE POLICY "Enable delete access for all users" ON purchase_orders FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_order_items;
CREATE POLICY "Enable read access for all users" ON purchase_order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_order_items;
CREATE POLICY "Enable insert access for all users" ON purchase_order_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_order_items;
CREATE POLICY "Enable update access for all users" ON purchase_order_items FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_order_items;
CREATE POLICY "Enable delete access for all users" ON purchase_order_items FOR DELETE USING (true);

-- Create settings table for app configuration (working hours, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for settings" ON settings;
CREATE POLICY "Enable all access for settings" ON settings FOR ALL USING (true);

-- Insert default working hours
INSERT INTO settings (key, value) VALUES (
  'working_hours',
  '{
    "saturday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "sunday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "monday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "tuesday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "wednesday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "thursday": {"open": "08:00", "close": "19:00", "isOpen": true},
    "friday": {"open": "08:00", "close": "19:00", "isOpen": false}
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Staff Salary Type & Payments
-- ============================================

-- Add salary_type to staff (monthly fixed salary OR commission-based)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_type text
  DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'commission'));

-- Staff payments ledger (tracks all financial transactions per staff)
CREATE TABLE IF NOT EXISTS staff_payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('salary', 'commission', 'advance', 'bonus', 'deduction')),
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for staff_payments" ON staff_payments FOR ALL USING (true);

-- ================================================
-- Client Credit & Fidélité System
-- ================================================

-- Add credit_balance column to clients (tracks how much the client owes)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_balance numeric DEFAULT 0;

-- Client payments ledger (tracks all financial movements per client)
CREATE TABLE IF NOT EXISTS client_payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'payment', 'credit')),
  amount numeric NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for client_payments" ON client_payments FOR ALL USING (true);
