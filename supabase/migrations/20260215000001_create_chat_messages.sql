
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.chat_messages enable row level security;

create policy "Enable read access for all users"
on public.chat_messages for select
using (true);

create policy "Enable insert access for all users"
on public.chat_messages for insert
with check (true);
