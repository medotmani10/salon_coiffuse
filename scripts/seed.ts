
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

async function seed() {
    console.log('Seeding data...');

    // 1. Create a Client
    const clientData = {
        first_name: 'Amine',
        last_name: 'Benali',
        phone: '0550123456',
        email: 'amine@example.com',
        tier: 'gold',
        loyalty_points: 120,
        total_spent: 15000,
        visit_count: 5
    };

    const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

    if (clientError) {
        console.error('Error seeding client:', clientError.message);
        return;
    }
    console.log('Created client:', client.first_name);

    // 2. Create Staff
    const staffData = {
        first_name: 'Sarah',
        last_name: 'Coiffeuse',
        phone: '0555987654',
        email: 'sarah@salon.com',
        specialties: ['Coupe', 'Coloration'],
        is_active: true
    };

    const { data: staff, error: staffError } = await supabase
        .from('staff')
        .insert(staffData)
        .select()
        .single();

    if (staffError) {
        console.error('Error seeding staff:', staffError.message);
    } else {
        console.log('Created staff:', staff.first_name);
    }

    // 3. Create Appointment
    if (client && staff) {
        const appointmentData = {
            client_id: client.id,
            staff_id: staff.id,
            date: new Date().toISOString().split('T')[0],
            start_time: '14:00:00',
            end_time: '15:00:00',
            status: 'confirmed',
            total_amount: 3000
        };

        const { error: apptError } = await supabase
            .from('appointments')
            .insert(appointmentData);

        if (apptError) console.error('Error seeding appointment:', apptError.message);
        else console.log('Created appointment');
    }
}

seed();
