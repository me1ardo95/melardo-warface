-- Support contact form: table and storage bucket for attachments

-- Table: support_messages (submissions from /support page)
create table if not exists public.support_messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  attachment_url text,
  created_at timestamptz default now() not null
);

alter table public.support_messages enable row level security;

-- Only admins can view support messages
create policy "Admins can view all support_messages"
  on public.support_messages for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Anyone can insert support_messages"
  on public.support_messages for insert
  with check (true);

-- Storage bucket "support" for file attachments (5 MB limit)
-- Created via Dashboard or:
insert into storage.buckets (id, name, public, file_size_limit)
values ('support', 'support', false, 5242880)
on conflict (id) do update set file_size_limit = 5242880;

-- Allow authenticated users to upload into support bucket
create policy "Authenticated can upload to support"
  on storage.objects for insert
  with check (
    bucket_id = 'support' and auth.role() = 'authenticated'
  );

-- Allow admins to read support bucket
create policy "Admins can read support bucket"
  on storage.objects for select
  using (
    bucket_id = 'support' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

