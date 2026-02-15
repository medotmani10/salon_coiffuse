-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_fr text NOT NULL,
    name_ar text,
    description text,
    price numeric NOT NULL DEFAULT 0, -- Selling Price
    cost_price numeric NOT NULL DEFAULT 0, -- Buying Price
    stock integer NOT NULL DEFAULT 0,
    min_stock integer NOT NULL DEFAULT 5,
    category text,
    image_url text,
    supplier_id uuid REFERENCES suppliers(id),
    barcode text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL, -- Rent, Utilities, Salary, Stock, Other
    amount numeric NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    payment_method text DEFAULT 'cash',
    supplier_id uuid REFERENCES suppliers(id), -- Optional link to supplier
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for authenticated users for now)
CREATE POLICY "Allow all for auth users" ON suppliers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all for auth users" ON products FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow all for auth users" ON expenses FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
