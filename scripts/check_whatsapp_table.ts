import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log("🔍 Checking if whatsapp_sessions table exists...\n");

    try {
        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('count')
            .limit(1);

        if (error) {
            console.error("❌ Error:", error.message);
            console.log("\n⚠️  Table 'whatsapp_sessions' does NOT exist!");
            console.log("\n📝 Solution:");
            console.log("   Run the migration in Supabase SQL Editor:");
            console.log("   File: supabase/migrations/20260215000002_whatsapp_sessions.sql");
            return;
        }

        console.log("✅ Table 'whatsapp_sessions' exists!");
        console.log("Data:", data);

    } catch (err: any) {
        console.error("❌ Unexpected error:", err.message);
    }
}

checkTable();
