
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

const categoryMapping: Record<string, string> = {
    'Coiffure': 'hair',
    'Maquillage': 'makeup',
    'Onglerie': 'nails',
    'Soin': 'skincare',
    'Massage': 'massage',
    'Esthétique': 'spa'
};

async function fixCategories() {
    console.log('Starting category fix...');

    const { data: services, error } = await supabase
        .from('services')
        .select('id, category');

    if (error) {
        console.error('Error fetching services:', error);
        return;
    }

    let updatedCount = 0;

    for (const service of services) {
        const correctCategory = categoryMapping[service.category];

        if (correctCategory) {
            console.log(`Fixing service ${service.id}: ${service.category} -> ${correctCategory}`);
            const { error: updateError } = await supabase
                .from('services')
                .update({ category: correctCategory })
                .eq('id', service.id);

            if (updateError) {
                console.error(`Failed to update service ${service.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Fixed ${updatedCount} services.`);
}

fixCategories();
