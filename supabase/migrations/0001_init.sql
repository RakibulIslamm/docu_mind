-- DocuMind initial schema
-- Run in the Supabase SQL editor (or via `supabase db push`).

------------------------------------------------------------
-- Profiles: 1:1 with auth.users
------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- Documents
------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  filename text not null,
  file_path text not null,
  file_size_bytes bigint,
  total_pages int,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_user
  on public.documents(user_id, created_at desc);

------------------------------------------------------------
-- Hierarchical sections (TOC tree)
------------------------------------------------------------
create table if not exists public.document_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  parent_id uuid references public.document_sections on delete cascade,
  position int not null,
  level int not null check (level between 1 and 6),
  section_number text,
  title text not null,
  start_page int,
  end_page int,
  content text,
  content_summary text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sections_doc
  on public.document_sections(document_id, position);
create index if not exists idx_sections_parent
  on public.document_sections(parent_id);

------------------------------------------------------------
-- Full text per page
------------------------------------------------------------
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  page_number int not null,
  content text not null,
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create index if not exists idx_pages_tsv
  on public.document_pages using gin(content_tsv);
create index if not exists idx_pages_doc
  on public.document_pages(document_id, page_number);

------------------------------------------------------------
-- Conversations
------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_ids uuid[] not null,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_user
  on public.conversations(user_id, created_at desc);

------------------------------------------------------------
-- Messages
------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_convo
  on public.messages(conversation_id, created_at);

------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_sections enable row level security;
alter table public.document_pages enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- profiles: a user can only see/update their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- documents
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own"
  on public.documents for select
  using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
  on public.documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
  on public.documents for delete
  using (auth.uid() = user_id);

-- document_sections
drop policy if exists "sections_select_own" on public.document_sections;
create policy "sections_select_own"
  on public.document_sections for select
  using (auth.uid() = user_id);

drop policy if exists "sections_insert_own" on public.document_sections;
create policy "sections_insert_own"
  on public.document_sections for insert
  with check (auth.uid() = user_id);

drop policy if exists "sections_update_own" on public.document_sections;
create policy "sections_update_own"
  on public.document_sections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sections_delete_own" on public.document_sections;
create policy "sections_delete_own"
  on public.document_sections for delete
  using (auth.uid() = user_id);

-- document_pages
drop policy if exists "pages_select_own" on public.document_pages;
create policy "pages_select_own"
  on public.document_pages for select
  using (auth.uid() = user_id);

drop policy if exists "pages_insert_own" on public.document_pages;
create policy "pages_insert_own"
  on public.document_pages for insert
  with check (auth.uid() = user_id);

drop policy if exists "pages_update_own" on public.document_pages;
create policy "pages_update_own"
  on public.document_pages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pages_delete_own" on public.document_pages;
create policy "pages_delete_own"
  on public.document_pages for delete
  using (auth.uid() = user_id);

-- conversations
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- messages: ownership is via the parent conversation
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

------------------------------------------------------------
-- Storage bucket for PDF uploads
------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_select_own" on storage.objects;
create policy "documents_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_insert_own" on storage.objects;
create policy "documents_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_storage_delete_own" on storage.objects;
create policy "documents_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
