-- Create chat_messages table
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table chat_messages enable row level security;

-- Policies (Allow all for now as it's a single user app, or authenticated only)
create policy "Allow all operations for authenticated users"
  on chat_messages for all
  using (true)
  with check (true);
