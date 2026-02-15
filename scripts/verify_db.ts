
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDb() {
    console.log("Checking database...");

    // Try to select from chat_messages
    const { data, error } = await supabase
        .from('chat_messages')
        .select('count')
        .limit(1);

    if (error) {
        console.error("❌ DB Check Failed:", error.message);
        if (error.message.includes('relation "public.chat_messages" does not exist')) {
            console.log("⚠️ Table 'chat_messages' is MISSING. Please run the SQL migration.");
        }
    } else {
        console.log("✅ Table 'chat_messages' exists!");
    }
}

checkDb();
