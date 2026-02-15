
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const validCategories = ['hair', 'nails', 'spa', 'skincare', 'makeup', 'massage'];

async function checkCategories() {
    const { data: services, error } = await supabase
        .from('services')
        .select('id, name_fr, category');

    if (error) {
        console.error('Error fetching services:', error);
        return;
    }

    console.log(`Found ${services.length} services.`);

    const invalidServices = services.filter(s => !validCategories.includes(s.category));

    if (invalidServices.length > 0) {
        console.error('Found services with invalid categories:');
        invalidServices.forEach(s => {
            console.log(`- ID: ${s.id}, Name: ${s.name_fr}, Category: "${s.category}"`);
        });
    } else {
        console.log('All service categories are valid.');
    }
}

checkCategories();
