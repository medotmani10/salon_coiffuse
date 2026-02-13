-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL DEFAULT 'Caisse Xpress',
    logo_url text,
    phone text,
    address text,
    tax_id text, -- NIF
    business_reg text, -- RC
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to view settings (needed for login screen etc)
CREATE POLICY "Enable read access for all users" ON store_settings
    FOR SELECT USING (true);

-- Create policy to allow authenticated users to update settings (usually admin only, but for now auth users)
CREATE POLICY "Enable update for authenticated users" ON store_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy to allow insert (should be only one row ideally)
CREATE POLICY "Enable insert for authenticated users" ON store_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default row if not exists
INSERT INTO store_settings (name)
SELECT 'Caisse Xpress'
WHERE NOT EXISTS (SELECT 1 FROM store_settings);
