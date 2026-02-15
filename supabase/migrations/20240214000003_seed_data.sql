
-- SQL Seed Script for ZenStyle Salon
-- Generates realistic linked data for testing

-- 1. Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, city, is_active, balance)
VALUES 
('Cosmetique d''Alger', 'Ahmed Benali', '0550123456', 'contact@cosmetique-dz.com', '12 Rue Didouche', 'Alger', true, 0),
('Best Hair PRO', 'Sarah Cohen', '0560987654', 'sales@besthair.com', '45 Ave Independance', 'Oran', true, 0),
('Import West', 'Karim Import', '0770112233', 'karim@importwest.dz', 'Zone Industrielle', 'Blida', true, 0)
ON CONFLICT DO NOTHING;

-- 2. Staff
INSERT INTO staff (first_name, last_name, email, phone, commission_rate, base_salary, is_active)
VALUES 
('Amel', 'Manager', 'amel@zenstyle.com', '0555000001', 10, 50000, true),
('Sarah', 'Stylist', 'sarah@zenstyle.com', '0555000002', 25, 30000, true),
('Leila', 'Stylist', 'leila@zenstyle.com', '0555000003', 25, 30000, true),
('Nadia', 'Stylist', 'nadia@zenstyle.com', '0555000004', 25, 30000, true),
('Rym', 'Assistant', 'rym@zenstyle.com', '0555000005', 15, 25000, true)
ON CONFLICT DO NOTHING;

-- 3. Services
INSERT INTO services (name_fr, name_ar, price, duration, category, color, is_active)
VALUES
('Coupe Femme', 'حلاقة نساء', 1500, 60, 'Coiffure', '#FF69B4', true),
('Brushing', 'تصفيف', 800, 30, 'Coiffure', '#FFB6C1', true),
('Coloration', 'صبغة', 4500, 120, 'Coloration', '#8A2BE2', true),
('Mèches / Balayage', 'ليماش', 6000, 150, 'Coloration', '#9370DB', true),
('Keratine', 'كيراتين', 12000, 180, 'Soins', '#DAA520', true),
('Manicure', 'مانيكير', 1200, 45, 'Onglerie', '#FF6347', true),
('Pedicure', 'باديكير', 1500, 60, 'Onglerie', '#FF4500', true),
('Maquillage Soirée', 'ماكياج سهرة', 3500, 90, 'Maquillage', '#C71585', true)
ON CONFLICT DO NOTHING;

-- 4. Products (Linked to Suppliers)
WITH supplier_ids AS (SELECT id, name FROM suppliers)
INSERT INTO products (name_fr, name_ar, price, stock, min_stock, category, supplier_id)
SELECT 
    p.name, p.name, p.price, p.stock, 5, p.cat, s.id
FROM (VALUES 
    ('Shampooing Pro', 2500, 20, 'Shampooing'),
    ('Masque Keratine', 4500, 12, 'Soins'),
    ('Huile Argan', 1800, 30, 'Huiles'),
    ('Laque Forte', 900, 15, 'Coiffage'),
    ('Serum Reparateur', 3200, 8, 'Soins'),
    ('Tube Coloration 5', 800, 50, 'Technique')
) AS p(name, price, stock, cat)
CROSS JOIN LATERAL (SELECT id FROM supplier_ids ORDER BY random() LIMIT 1) s
ON CONFLICT DO NOTHING;

-- 5. Clients (Generate 50)
INSERT INTO clients (first_name, last_name, phone, email, notes, total_spent, visit_count, loyalty_points, tier)
SELECT 
    'Client' || s, 
    'Nom' || s, 
    '0550' || lpad(s::text, 6, '0'), 
    'client' || s || '@mail.com', 
    'Fidèle', 
    0, 0, 0, 'bronze'
FROM generate_series(1, 50) s
ON CONFLICT DO NOTHING;

-- 6. Appointments & Transactions (Historical Data - Last 60 days)
DO $$
DECLARE 
    curr_date date := CURRENT_DATE - 60;
    end_date date := CURRENT_DATE;
    daily_appts int;
    i int;
    new_appt_id uuid;
    client_rec record;
    staff_rec record;
    service_rec record;
    product_rec record;
    tx_id uuid;
BEGIN
    WHILE curr_date <= end_date LOOP
        -- Skip Fridays sometimes
        IF extract(isodow from curr_date) <> 5 OR random() > 0.7 THEN
            
            -- Random number of appointments (3 to 8)
            daily_appts := floor(random() * 6 + 3);
            
            FOR i IN 1..daily_appts LOOP
                -- Select random refs
                SELECT * INTO client_rec FROM clients ORDER BY random() LIMIT 1;
                SELECT * INTO staff_rec FROM staff ORDER BY random() LIMIT 1;
                SELECT * INTO service_rec FROM services ORDER BY random() LIMIT 1;
                
                -- Insert Appointment
                INSERT INTO appointments (
                    client_id, staff_id, date, start_time, end_time, status, total_amount, notes, created_at
                ) VALUES (
                    client_rec.id, 
                    staff_rec.id, 
                    curr_date, 
                    ((9 + floor(random() * 8)) || ':00:00')::time, 
                    ((10 + floor(random() * 8)) || ':00:00')::time, 
                    CASE WHEN random() > 0.1 THEN 'completed' ELSE 'cancelled' END,
                    service_rec.price,
                    'Auto-generated',
                    curr_date + time '10:00'
                ) RETURNING id INTO new_appt_id;

                -- If completed, create Transaction
                IF random() > 0.1 THEN 
                    INSERT INTO transactions (
                        client_id, staff_id, total, subtotal, payment_method, payment_status, created_at
                    ) VALUES (
                        client_rec.id,
                        staff_rec.id,
                        service_rec.price,
                        service_rec.price,
                        'cash',
                        'paid',
                        curr_date + time '12:00'
                    ) RETURNING id INTO tx_id;

                    -- Transaction Item
                    INSERT INTO transaction_items (
                        transaction_id, item_type, item_id, name_fr, quantity, unit_price, total
                    ) VALUES (
                        tx_id, 'service', service_rec.id, service_rec.name_fr, 1, service_rec.price, service_rec.price
                    );

                    -- Update Client Stats
                    UPDATE clients SET 
                        total_spent = total_spent + service_rec.price,
                        visit_count = visit_count + 1,
                        loyalty_points = loyalty_points + floor(service_rec.price / 100)
                    WHERE id = client_rec.id;
                END IF;

            END LOOP;

            -- Random Retail Sales
            IF random() > 0.5 THEN
                SELECT * INTO product_rec FROM products ORDER BY random() LIMIT 1;
                
                INSERT INTO transactions (
                    staff_id, total, subtotal, payment_method, payment_status, created_at
                ) VALUES (
                    (SELECT id FROM staff ORDER BY random() LIMIT 1),
                    product_rec.price,
                    product_rec.price,
                    'card',
                    'paid',
                    curr_date + time '15:00'
                ) RETURNING id INTO tx_id;

                INSERT INTO transaction_items (
                    transaction_id, item_type, item_id, name_fr, quantity, unit_price, total
                ) VALUES (
                    tx_id, 'product', product_rec.id, product_rec.name_fr, 1, product_rec.price, product_rec.price
                );
            END IF;

        END IF;
        curr_date := curr_date + 1;
    END LOOP;
END $$;

-- 7. Expenses
INSERT INTO expenses (category, amount, date, description, payment_method)
SELECT 
    CASE floor(random() * 3) 
        WHEN 0 THEN 'Electricité' 
        WHEN 1 THEN 'Eau' 
        ELSE 'Internet' 
    END,
    floor(random() * 5000 + 1000),
    CURRENT_DATE - (i * 30),
    'Facture Mensuelle',
    'cash'
FROM generate_series(0, 2) i;

INSERT INTO expenses (category, amount, date, description, payment_method)
VALUES ('Loyer', 45000, CURRENT_DATE - 5, 'Loyer Mensuel', 'cash');
