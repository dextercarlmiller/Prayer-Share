-- ============================================================
-- Prayer Share — Initial Schema + RLS Policies
-- Run this in your Supabase SQL editor (or apply via CLI)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. PROFILES
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  avatar_url   text,
  push_token   text,
  reminder_time text,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- 2. PRAYER ITEMS
create type public.prayer_category as enum ('Health','Family','Work','Relationships','Financial','Spiritual','Other');
create type public.prayer_item_type as enum ('request','praise');

create table if not exists public.prayer_items (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) >= 3 and char_length(title) <= 120),
  description text not null default '',
  category    public.prayer_category not null default 'Spiritual',
  type        public.prayer_item_type not null default 'request',
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger prayer_items_updated_at before update on public.prayer_items for each row execute procedure public.set_updated_at();

-- 3. PRAYER SHARES
create table if not exists public.prayer_shares (
  id                   uuid primary key default uuid_generate_v4(),
  prayer_item_id       uuid not null references public.prayer_items(id) on delete cascade,
  shared_with_user_id  uuid not null references public.profiles(id) on delete cascade,
  shared_at            timestamptz not null default now(),
  unique (prayer_item_id, shared_with_user_id)
);

-- 4. PRAYER COUNTS
create table if not exists public.prayer_counts (
  id                 uuid primary key default uuid_generate_v4(),
  prayer_item_id     uuid not null references public.prayer_items(id) on delete cascade,
  prayed_by_user_id  uuid not null references public.profiles(id) on delete cascade,
  prayed_at          timestamptz not null default now(),
  unique (prayer_item_id, prayed_by_user_id)
);

-- 5. INVITES
create table if not exists public.invites (
  id              uuid primary key default uuid_generate_v4(),
  created_by      uuid not null references public.profiles(id) on delete cascade,
  email           text,
  token           text unique not null,
  prayer_item_id  uuid references public.prayer_items(id) on delete set null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- 6. RLS
alter table public.profiles enable row level security;
alter table public.prayer_items enable row level security;
alter table public.prayer_shares enable row level security;
alter table public.prayer_counts enable row level security;
alter table public.invites enable row level security;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_own_write" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "prayer_items_read" on public.prayer_items for select using (owner_id = auth.uid() or exists (select 1 from public.prayer_shares ps where ps.prayer_item_id = id and ps.shared_with_user_id = auth.uid()));
create policy "prayer_items_insert" on public.prayer_items for insert with check (owner_id = auth.uid());
create policy "prayer_items_update" on public.prayer_items for update using (owner_id = auth.uid());
create policy "prayer_items_delete" on public.prayer_items for delete using (owner_id = auth.uid());

create policy "prayer_shares_read" on public.prayer_shares for select using (shared_with_user_id = auth.uid() or exists (select 1 from public.prayer_items pi where pi.id = prayer_item_id and pi.owner_id = auth.uid()));
create policy "prayer_shares_insert" on public.prayer_shares for insert with check (exists (select 1 from public.prayer_items pi where pi.id = prayer_item_id and pi.owner_id = auth.uid()));
create policy "prayer_shares_delete" on public.prayer_shares for delete using (exists (select 1 from public.prayer_items pi where pi.id = prayer_item_id and pi.owner_id = auth.uid()));

create policy "prayer_counts_read" on public.prayer_counts for select using (exists (select 1 from public.prayer_items pi where pi.id = prayer_item_id and (pi.owner_id = auth.uid() or exists (select 1 from public.prayer_shares ps where ps.prayer_item_id = pi.id and ps.shared_with_user_id = auth.uid()))));
create policy "prayer_counts_insert" on public.prayer_counts for insert with check (prayed_by_user_id = auth.uid());
create policy "prayer_counts_delete" on public.prayer_counts for delete using (prayed_by_user_id = auth.uid());

create policy "invites_owner_all" on public.invites for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "invites_read_by_token" on public.invites for select using (true);

-- 7. INDEXES
create index if not exists idx_prayer_items_owner_id on public.prayer_items(owner_id);
create index if not exists idx_prayer_items_type on public.prayer_items(type);
create index if not exists idx_prayer_items_is_resolved on public.prayer_items(is_resolved);
create index if not exists idx_prayer_shares_shared_with on public.prayer_shares(shared_with_user_id);
create index if not exists idx_prayer_counts_item on public.prayer_counts(prayer_item_id);
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_invites_token on public.invites(token);
