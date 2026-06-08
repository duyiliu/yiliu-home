create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  category text not null default '常用',
  description text not null default '',
  accent text not null default '#74e6d6',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  done boolean not null default false,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'scratch',
  title text not null default '随手记',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'link' check (kind in ('link', 'rss')),
  category text not null default '资讯',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_title text not null default '',
  source_category text not null default '',
  title text not null,
  url text not null,
  summary text not null default '',
  published_at text not null default '',
  fetched_at timestamptz not null default now(),
  unique (user_id, source_id, url)
);

drop trigger if exists links_set_updated_at on public.links;
create trigger links_set_updated_at
before update on public.links
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

alter table public.links enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.sources enable row level security;
alter table public.feed_items enable row level security;

drop policy if exists "links are private" on public.links;
create policy "links are private" on public.links
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tasks are private" on public.tasks;
create policy "tasks are private" on public.tasks
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notes are private" on public.notes;
create policy "notes are private" on public.notes
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "sources are private" on public.sources;
create policy "sources are private" on public.sources
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "feed items are private" on public.feed_items;
create policy "feed items are private" on public.feed_items
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.sources
    where sources.id = feed_items.source_id
      and sources.user_id = auth.uid()
  )
);

create index if not exists links_user_category_idx on public.links(user_id, category, sort_order);
create index if not exists tasks_user_done_idx on public.tasks(user_id, done, sort_order);
create index if not exists sources_user_category_idx on public.sources(user_id, category, sort_order);
create index if not exists feed_items_user_fetched_idx on public.feed_items(user_id, fetched_at desc);
create index if not exists feed_items_user_source_idx on public.feed_items(user_id, source_id);
