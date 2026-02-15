
import { createClient } from '@supabase/supabase-js';
import { fakerFR as faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NUM_CLIENTS = 40; // Maintain manageable number
const HISTORY_DAYS = 60; // 2 months history

// Service Catalog
const SERVICES = [
    { name: 'Coupe Femme', price: 1500, duration: 60, category: 'Coiffure' },
    { name: 'Brushing', price: 800, duration: 30, category: 'Coiffure' },
    { name: 'Coloration', price: 4500, duration: 120, category: 'Coloration' },
    { name: 'Mèches / Balayage', price: 6000, duration: 150, category: 'Coloration' },
    { name: 'Keratine', price: 12000, duration: 180, category: 'Soins' },
    { name: 'Manicure', price: 1200, duration: 45, category: 'Onglerie' },
    { name: 'Pedicure', price: 1500, duration: 60, category: 'Onglerie' },
    { name: 'Vernis Permanent', price: 2500, duration: 60, category: 'Onglerie' },
    { name: 'Maquillage Soirée', price: 3500, duration: 90, category: 'Maquillage' },
    { name: 'Epilation Complète', price: 2500, duration: 60, category: 'Esthétique' }
];

// Product Inventory
const PRODUCTS = [
    { name: 'Shampooing L\'Oréal Pro', price: 2500, cost: 1500, stock: 20, min: 5, category: 'Shampooing' },
    { name: 'Masque Kérastase', price: 4500, cost: 2800, stock: 12, min: 3, category: 'Soins' },
    { name: 'Huile d\'Argan Bio', price: 1800, cost: 900, stock: 30, min: 5, category: 'Huiles' },
    { name: 'Laque Fixation Forte', price: 900, cost: 450, stock: 15, min: 5, category: 'Coiffage' },
    { name: 'Serum Réparateur', price: 3200, cost: 1800, stock: 8, min: 5, category: 'Soins' },
    { name: 'Coloration Tube No. 5', price: 800, cost: 400, stock: 50, min: 10, category: 'Technique' },
    { name: 'Poudre Décolorante', price: 2200, cost: 1100, stock: 10, min: 2, category: 'Technique' },
    { name: 'Cire Coiffante Homme', price: 1200, cost: 600, stock: 25, min: 5, category: 'Coiffage' }
];

const SUPPLIERS = ['Cosmetique d\'Alger', 'Best Hair PRO', 'Import West', 'Global Beauty DZ'];
const STAFF_NAMES = [
    { name: 'Amel', role: 'manager' },
    { name: 'Sarah', role: 'stylist' },
    { name: 'Leila', role: 'stylist' },
    { name: 'Nadia', role: 'stylist' },
    { name: 'Rym', role: 'assistant' }
];

async function seed() {
    console.log('🚀 Starting business simulation...');

    // 1. Create/Get Suppliers
    const supplierIds: string[] = [];
    console.log('📦 Managing Suppliers...');
    for (const name of SUPPLIERS) {
        let { data } = await supabase.from('suppliers').select('id').eq('name', name).single();
        if (!data) {
            const { data: newSup, error } = await supabase.from('suppliers').insert({
                name,
                contact_person: faker.person.fullName(),
                phone: faker.phone.number(),
                email: faker.internet.email(),
                address: faker.location.streetAddress(),
                city: 'Alger',
                is_active: true,
                balance: 0
            }).select().single();
            if (error) console.error(`Error creating supplier ${name}:`, error.message);
            data = newSup;
        }
        if (data) supplierIds.push(data.id);
    }

    // 2. Create/Get Products (Inventory linked to POS)
    const productMap = new Map(); // name -> {id, price}
    console.log('💄 Stocking Inventory...');
    for (const prod of PRODUCTS) {
        let { data } = await supabase.from('products').select('id, stock').eq('name_fr', prod.name).single();
        if (!data) {
            const { data: newProd, error } = await supabase.from('products').insert({
                name_fr: prod.name,
                name_ar: prod.name,
                price: prod.price,
                stock: prod.stock,
                min_stock: prod.min,
                category: prod.category,
                supplier_id: faker.helpers.arrayElement(supplierIds),
                is_active: true
            }).select().single();
            if (error) console.error(`Error creating product ${prod.name}:`, error.message);
            data = newProd;
        } else {
            // Reset stock if existing
            await supabase.from('products').update({ stock: prod.stock }).eq('id', data.id);
        }
        if (data) productMap.set(prod.name, { id: data.id, price: prod.price, name: prod.name });
    }

    // 3. Create/Get Services
    const serviceIds: any[] = [];
    console.log('✂️  Setting up Services...');
    for (const svc of SERVICES) {
        let { data } = await supabase.from('services').select('id, price').eq('name_fr', svc.name).single();
        if (!data) {
            const { data: newSvc, error } = await supabase.from('services').insert({
                name_fr: svc.name,
                name_ar: svc.name,
                price: svc.price,
                duration: svc.duration,
                category: svc.category,
                color: faker.color.rgb(),
                is_active: true
            }).select().single();
            if (error) console.error(`Error creating service ${svc.name}:`, error.message);
            data = newSvc;
        }
        if (data) serviceIds.push({ id: data.id, price: data.price, name: svc.name });
    }

    // 4. Create/Get Staff
    const staffIds: string[] = [];
    console.log('👩‍🦰 Hiring Staff...');
    for (const member of STAFF_NAMES) {
        let { data } = await supabase.from('staff').select('id').eq('first_name', member.name).single();
        if (!data) {
            const { data: newStaff, error } = await supabase.from('staff').insert({
                first_name: member.name,
                last_name: faker.person.lastName(),
                email: faker.internet.email({ firstName: member.name }),
                phone: faker.phone.number(),
                is_active: true,
                commission_rate: member.role === 'manager' ? 10 : 25,
                base_salary: member.role === 'manager' ? 50000 : 30000
            }).select().single();
            if (error) console.error(`Error creating staff ${member.name}:`, error.message);
            data = newStaff;
        }
        if (data) staffIds.push(data.id);
    }

    // 5. Create Clients
    const clientIds: string[] = [];
    console.log('👥 Registering Clients...');
    const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });

    if ((count || 0) < NUM_CLIENTS) {
        const needed = NUM_CLIENTS - (count || 0);
        const clientsToInsert = [];
        for (let i = 0; i < needed; i++) {
            const firstName = faker.person.firstName('female');
            const lastName = faker.person.lastName();
            clientsToInsert.push({
                first_name: firstName,
                last_name: lastName,
                phone: faker.phone.number(),
                email: faker.internet.email({ firstName, lastName }),
                notes: 'Client fidèle',
                total_spent: 0,
                visit_count: 0,
                loyalty_points: 0,
                tier: 'bronze'
            });
        }
        const { data: newClients, error } = await supabase.from('clients').insert(clientsToInsert).select();
        if (error) console.error("Error creating clients:", error.message);
        if (newClients) clientIds.push(...newClients.map(c => c.id));
    } else {
        const { data } = await supabase.from('clients').select('id').limit(NUM_CLIENTS);
        if (data) clientIds.push(...data.map(c => c.id));
    }

    // 6. Simulate Business Days (Appointments & POS Sales)
    console.log('📅 Simulating 60 days of business operations...');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - HISTORY_DAYS);

    const appointmentsBatch = [];
    const transactionsBatch = [];
    const transactionItemsBatch = [];

    // Track updates for clients
    const clientUpdates: Record<string, { spent: number, visits: number, points: number }> = {};
    clientIds.forEach(id => clientUpdates[id] = { spent: 0, visits: 0, points: 0 });

    for (let i = 0; i <= HISTORY_DAYS; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        // Skip some Sundays
        const isWeekend = currentDate.getDay() === 5; // Friday
        if (isWeekend && Math.random() > 0.3) continue;

        const dateStr = currentDate.toISOString().split('T')[0];

        // --- 6a. Appointments (Services) ---
        const dailyAppts = faker.number.int({ min: 3, max: 12 }); // 3 to 12 clients a day

        for (let j = 0; j < dailyAppts; j++) {
            if (!clientIds.length || !staffIds.length || !serviceIds.length) {
                // Warning logged once outside loop ideally, but safe here
                continue;
            }

            const client = faker.helpers.arrayElement(clientIds);
            const staff = faker.helpers.arrayElement(staffIds);
            const service = faker.helpers.arrayElement(serviceIds);

            const hour = faker.number.int({ min: 9, max: 17 });
            const startTime = `${hour.toString().padStart(2, '0')}:${faker.helpers.arrayElement(['00', '30'])}:00`;
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;

            const statusRand = Math.random();
            let status = 'completed';
            if (statusRand > 0.95) status = 'cancelled';
            else if (statusRand > 0.90) status = 'no-show';

            appointmentsBatch.push({
                client_id: client,
                staff_id: staff,
                date: dateStr,
                start_time: startTime,
                end_time: endTime,
                status: status,
                total_amount: service.price,
                notes: 'Réservation via téléphone',
                created_at: `${dateStr}T${startTime}Z`
            });

            if (status === 'completed') {
                clientUpdates[client].spent += service.price;
                clientUpdates[client].visits += 1;
                clientUpdates[client].points += Math.floor(service.price / 100);
            }
        }

        // --- 6b. Retail Sales (Walk-ins buying products) ---
        const productsArray = Array.from(productMap.values());
        if (Math.random() > 0.5 && productsArray.length > 0) {
            const retailSales = faker.number.int({ min: 1, max: 5 });
            for (let k = 0; k < retailSales; k++) {
                const product = faker.helpers.arrayElement(productsArray);
                const qty = faker.number.int({ min: 1, max: 2 });
                const total = product.price * qty;
                const client = Math.random() > 0.3 ? faker.helpers.arrayElement(clientIds) : null;

                const txId = faker.string.uuid();

                transactionsBatch.push({
                    id: txId,
                    client_id: client,
                    staff_id: faker.helpers.arrayElement(staffIds),
                    total: total,
                    subtotal: total,
                    tax: 0,
                    discount: 0,
                    payment_method: faker.helpers.arrayElement(['cash', 'card', 'cash']),
                    payment_status: 'paid',
                    created_at: `${dateStr}T14:00:00Z`
                });

                transactionItemsBatch.push({
                    transaction_id: txId,
                    item_type: 'product',
                    item_id: product.id,
                    name_ar: product.name,
                    name_fr: product.name,
                    quantity: qty,
                    unit_price: product.price,
                    total: total
                });

                if (client) {
                    clientUpdates[client].spent += total;
                }
            }
        }
    }

    console.log(`📝 Flushing ${appointmentsBatch.length} appointments...`);
    const { data: insertedAppts, error: apptErr } = await supabase.from('appointments').insert(appointmentsBatch).select();
    if (apptErr) console.error('Appt Error:', apptErr.message);

    if (insertedAppts) {
        const apptTransactions = [];
        const apptTxItems = [];

        for (const appt of insertedAppts) {
            if (appt.status === 'completed') {
                const txId = faker.string.uuid();
                const service = faker.helpers.arrayElement(serviceIds);

                apptTransactions.push({
                    id: txId,
                    client_id: appt.client_id,
                    staff_id: appt.staff_id,
                    total: appt.total_amount,
                    subtotal: appt.total_amount,
                    payment_method: 'cash',
                    payment_status: 'paid',
                    created_at: appt.created_at
                });

                apptTxItems.push({
                    transaction_id: txId,
                    item_type: 'service',
                    item_id: service.id,
                    name_ar: service.name,
                    name_fr: service.name,
                    quantity: 1,
                    unit_price: appt.total_amount,
                    total: appt.total_amount
                });
            }
        }

        const allTransactions = [...transactionsBatch, ...apptTransactions];
        const allItems = [...transactionItemsBatch, ...apptTxItems];

        console.log(`💰 Flushing ${allTransactions.length} transactions...`);
        const chunkSize = 100;
        for (let i = 0; i < allTransactions.length; i += chunkSize) {
            const txChunk = allTransactions.slice(i, i + chunkSize);
            await supabase.from('transactions').insert(txChunk);
        }

        console.log(`🧾 Flushing ${allItems.length} transaction items...`);
        for (let i = 0; i < allItems.length; i += chunkSize) {
            const itemChunk = allItems.slice(i, i + chunkSize);
            await supabase.from('transaction_items').insert(itemChunk);
        }
    }

    // 7. Update Client Stats
    console.log('🏆 Updating Client Logic...');
    for (const [id, stats] of Object.entries(clientUpdates)) {
        if (stats.spent > 0) {
            let tier = 'bronze';
            if (stats.spent > 50000) tier = 'silver';
            if (stats.spent > 100000) tier = 'gold';

            await supabase.from('clients').update({
                total_spent: stats.spent,
                visit_count: stats.visits,
                loyalty_points: stats.points,
                tier: tier,
                last_visit: new Date().toISOString()
            }).eq('id', id);
        }
    }

    // 8. Generate Operational Expenses
    console.log('💸 Generating Operational Expenses...');
    const expenseData = [];
    for (let i = 0; i <= 2; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const dStr = d.toISOString().split('T')[0];

        expenseData.push({ category: 'Loyer', amount: 45000, date: dStr, description: 'Loyer Salon' });
        expenseData.push({ category: 'Electricité', amount: 6500, date: dStr, description: 'Facture Sonelgaz' });
        expenseData.push({ category: 'Eau', amount: 1200, date: dStr, description: 'Facture SEAAL' });
        expenseData.push({ category: 'Internet', amount: 3500, date: dStr, description: 'Abonnement Fibre' });
    }
    await supabase.from('expenses').insert(expenseData);

    console.log('✅✅ SIMULATION COMPLETE! The business is alive.');
}

seed().catch(console.error);
