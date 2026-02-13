-- Create app_settings table for general configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public read access (for settings like working hours that all users need to see)
CREATE POLICY "Allow authenticated read access" ON app_settings FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users (or just admins?) can update settings
-- For now, allow all authenticated users to update settings to unblock development
CREATE POLICY "Allow authenticated update" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Inherit permissions or define specific roles later
