-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  first_name text,
  last_name text,
  role text check (role in ('admin', 'manager', 'staff', 'receptionist')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clients
create table clients (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  birth_date date,
  notes text,
  loyalty_points integer default 0,
  tier text default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  total_spent numeric default 0,
  visit_count integer default 0,
  last_visit timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Staff
create table staff (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  email text unique,
  specialties text[], -- Array of strings
  commission_rate numeric default 0,
  base_salary numeric default 0,
  hire_date date default CURRENT_DATE,
  is_active boolean default true,
  working_hours jsonb, -- JSON structure for schedule
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Services
create table services (
  id uuid default uuid_generate_v4() primary key,
  name_ar text not null,
  name_fr text not null,
  category text not null,
  price numeric not null,
  duration integer not null, -- in minutes
  description_ar text,
  description_fr text,
  color text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- appointments
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed' check (status in ('confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')),
  notes text,
  total_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Appointment Services (Join table)
create table appointment_services (
  id uuid default uuid_generate_v4() primary key,
  appointment_id uuid references appointments(id) on delete cascade,
  service_id uuid references services(id) on delete restrict,
  price_at_booking numeric not null, -- snapshot of price
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products (Retail)
create table products (
  id uuid default uuid_generate_v4() primary key,
  name_ar text not null,
  name_fr text not null,
  category text,
  price numeric not null,
  stock integer default 0,
  min_stock integer default 5,
  expiry_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inventory Items (Internal Use)
create table inventory_items (
  id uuid default uuid_generate_v4() primary key,
  name_ar text not null,
  name_fr text not null,
  category text,
  quantity numeric default 0,
  unit text,
  min_stock numeric default 5,
  max_stock numeric,
  supplier text,
  expiry_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  subtotal numeric default 0,
  discount numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  payment_method text check (payment_method in ('cash', 'card', 'split', 'loyalty')),
  payment_status text default 'paid' check (payment_status in ('pending', 'paid', 'refunded')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transaction Items
create table transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references transactions(id) on delete cascade,
  item_type text check (item_type in ('service', 'product')),
  item_id uuid, -- Can reference service or product, strictly loose FK or handle via app logic
  name_ar text, -- Snapshot name
  name_fr text, -- Snapshot name
  quantity integer default 1,
  unit_price numeric not null,
  total numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suppliers
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase Orders
create table purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  supplier_id uuid references suppliers(id) on delete set null,
  order_date date default CURRENT_DATE,
  expected_date date,
  received_date date,
  status text default 'pending' check (status in ('pending', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal numeric default 0,
  tax numeric default 0,
  total numeric default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase Order Items
create table purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_order_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null, -- Link to products table
  quantity integer not null,
  unit_price numeric not null,
  total numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) policies would go here.
-- For now, we'll enable RLS but create open policies for development (WARNING: Secure this before prod)

alter table profiles enable row level security;
alter table clients enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table products enable row level security;
alter table inventory_items enable row level security;
alter table transactions enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

-- Policy examples (Allow all for anon/authenticated for now to ease dev)
create policy "Allow all access" on profiles for all using (true);
create policy "Allow all access" on clients for all using (true);
create policy "Allow all access" on staff for all using (true);
create policy "Allow all access" on services for all using (true);
create policy "Allow all access" on appointments for all using (true);
create policy "Allow all access" on appointment_services for all using (true);
create policy "Allow all access" on products for all using (true);
create policy "Allow all access" on inventory_items for all using (true);
create policy "Allow all access" on transactions for all using (true);
create policy "Allow all access" on transaction_items for all using (true);
create policy "Allow all access" on suppliers for all using (true);
create policy "Allow all access" on purchase_orders for all using (true);
create policy "Allow all access" on purchase_order_items for all using (true);
