
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
    console.log('Checking database connection...');
    console.log('URL:', supabaseUrl);

    try {
        const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Error:', error.message);
            if (error.code === 'PGRST301' || error.message.includes('relation "public.clients" does not exist')) {
                console.error('CRITICAL: The "clients" table does not exist. Please run the SQL from "supabase/schema.sql" in your Supabase Dashboard SQL Editor.');
            }
        } else {
            console.log('Connection Successful!');
            console.log(`Found ${data?.length ?? 0} rows (count might be approx).`);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkDb();
