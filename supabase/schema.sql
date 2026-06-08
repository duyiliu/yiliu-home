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

create or replace function public.seed_user_home(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.links(user_id, title, url, category, description, accent, sort_order)
  values
    (target_user_id, '邮箱', 'https://mail.google.com/', '工作流', '处理收件箱与日程邀请', '#f3c969', 10),
    (target_user_id, '日历', 'https://calendar.google.com/', '工作流', '查看会议和时间块', '#74e6d6', 20),
    (target_user_id, 'Notion', 'https://www.notion.so/', '工作流', '项目文档和知识库', '#ffffff', 30),
    (target_user_id, 'GitHub', 'https://github.com/', '开发', '代码仓库、PR 和 Issue', '#9ea8ff', 40),
    (target_user_id, 'Vercel', 'https://vercel.com/dashboard', '开发', '部署状态与项目监控', '#ffffff', 50),
    (target_user_id, 'MDN', 'https://developer.mozilla.org/zh-CN/', '开发', 'Web API 与兼容性查询', '#74e6d6', 60),
    (target_user_id, '掘金', 'https://juejin.cn/', '信息', '中文技术趋势与实践', '#4c8dff', 70),
    (target_user_id, '少数派', 'https://sspai.com/', '信息', '效率工具与数字生活', '#ff6b6b', 80),
    (target_user_id, '阮一峰周刊', 'https://www.ruanyifeng.com/blog/', '信息', '技术与互联网观察', '#f3c969', 90)
  on conflict do nothing;

  insert into public.tasks(user_id, title, priority, sort_order)
  values
    (target_user_id, '写下今天最重要的 1 件事', 'high', 10),
    (target_user_id, '检查日历、邮箱和未读消息', 'normal', 20)
  on conflict do nothing;

  insert into public.notes(user_id, kind, title, body)
  values (
    target_user_id,
    'scratch',
    '随手记',
    '临时想法、会议链接、命令片段都可以先放这里。'
  )
  on conflict (user_id, kind) do nothing;

  insert into public.sources(user_id, title, url, kind, category, description, sort_order)
  values
    (target_user_id, 'Hacker News', 'https://news.ycombinator.com/rss', 'rss', '技术', '海外技术社区热门讨论', 10),
    (target_user_id, 'GitHub Blog', 'https://github.blog/feed/', 'rss', '技术', 'GitHub 官方更新', 20),
    (target_user_id, '阮一峰网络日志', 'https://www.ruanyifeng.com/blog/atom.xml', 'rss', '中文', '科技爱好者周刊与文章', 30),
    (target_user_id, 'Solidot', 'https://www.solidot.org/index.rss', 'rss', '中文', '开源、科学与技术新闻', 40),
    (target_user_id, 'Product Hunt', 'https://www.producthunt.com/', 'link', '产品', '新产品和工具发现', 50)
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_user_home(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_home on auth.users;
create trigger on_auth_user_created_seed_home
after insert on auth.users
for each row execute function public.handle_new_user();
