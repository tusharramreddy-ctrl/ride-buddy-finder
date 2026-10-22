-- Ride Buddy: database setup for Supabase.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- Safe to run again: it only creates what's missing.
--
-- Security model: Row Level Security (RLS) is on for every table, so the
-- database itself enforces who can read and change what, even though the
-- browser talks to it directly with the public "publishable" key.
-- Demo riders, demo posts and groups live in the app's code; ids like
-- "r01", "demo-1" and "weekend-scenic" are stored as text where needed.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  bio text not null default '' check (char_length(bio) <= 160),
  region text,                       -- approximate area only
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  style text check (style in ('cruiser', 'explorer', 'carver', 'social')),
  quiz_answers int[],
  availability text[] not null default '{}',
  gender_shown text check (gender_shown in ('woman', 'man', 'non-binary')), -- only set if the rider chose to show it
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private profile details: only the owner can read these.
create table if not exists public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gender text check (gender in ('woman', 'man', 'non-binary'))
);

-- ------------------------------------------------------------------- bikes
create table if not exists public.garage_bikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  bike jsonb not null,
  year int check (year between 1950 and 2100),
  nickname text not null default '' check (char_length(nickname) <= 30),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists garage_bikes_user_idx on public.garage_bikes (user_id);

-- ------------------------------------------------------------------- posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('ride', 'bike', 'journey', 'road', 'question', 'group-ride')),
  body text not null check (char_length(body) between 1 and 1000),
  image_url text,
  bike jsonb,
  ride jsonb,        -- distance, duration and a privacy-trimmed route, only if shared
  plan jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- Comments and likes use text post ids so they also work on demo posts.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id);

create table if not exists public.post_likes (
  post_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Deleting a post also removes its comments and likes.
create or replace function public.cleanup_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.comments where post_id = old.id::text;
  delete from public.post_likes where post_id = old.id::text;
  return old;
end $$;
drop trigger if exists posts_cleanup on public.posts;
create trigger posts_cleanup after delete on public.posts for each row execute function public.cleanup_post();

-- --------------------------------------------------------- blocks & reports
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  blocked_id text not null,          -- a user id, or a demo rider id
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  target_type text not null check (target_type in ('post', 'rider', 'group-message')),
  target_id text not null,
  reason text not null check (char_length(reason) <= 600),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------- direct messages
-- To a real rider (recipient_id) or to a demo rider (demo_rider_id), never both.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  recipient_id uuid references auth.users (id) on delete cascade,
  demo_rider_id text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((recipient_id is null) <> (demo_rider_id is null)),
  check (recipient_id is distinct from sender_id)
);
create index if not exists dm_sender_idx on public.direct_messages (sender_id, created_at);
create index if not exists dm_recipient_idx on public.direct_messages (recipient_id, created_at);

-- ------------------------------------------------------------------ groups
create table if not exists public.group_members (
  group_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  sender_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists group_messages_idx on public.group_messages (group_id, created_at);

-- ------------------------------------------------------------------- rides
-- Private: only the rider can see their own rides and full GPS routes.
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 80),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  moving_sec int not null check (moving_sec >= 0),
  distance_m double precision not null check (distance_m >= 0),
  points jsonb not null default '[]',
  source text not null check (source in ('gps', 'manual')),
  bike_id uuid references public.garage_bikes (id) on delete set null,
  notes text not null default '' check (char_length(notes) <= 500),
  shared_post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rides_user_idx on public.rides (user_id, started_at desc);

-- ------------------------------------------------------ row level security
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.garage_bikes enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.direct_messages enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.rides enable row level security;

-- Helper: has `blocker` blocked `blocked`?
create or replace function public.has_blocked(blocker uuid, blocked uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks b where b.blocker_id = blocker and b.blocked_id = blocked::text)
$$;

do $$
declare t text;
begin
  -- Drop and recreate policies so re-running this file stays correct.
  for t in select unnest(array['profiles','profile_private','garage_bikes','posts','comments','post_likes','blocks','reports','direct_messages','group_members','group_messages','rides']) loop
    execute (select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t), ' '), '')
             from pg_policies where schemaname = 'public' and tablename = t);
  end loop;
end $$;

-- Profiles: signed-in riders can see each other; you can only edit yourself.
create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "delete own profile" on public.profiles for delete to authenticated using (id = auth.uid());

create policy "own private profile" on public.profile_private for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bikes: public within the community, edited only by their owner.
create policy "bikes readable" on public.garage_bikes for select to authenticated using (true);
create policy "own bikes" on public.garage_bikes for insert to authenticated with check (user_id = auth.uid());
create policy "update own bikes" on public.garage_bikes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own bikes" on public.garage_bikes for delete to authenticated using (user_id = auth.uid());

-- Posts, comments, likes: readable by signed-in riders; you change only your own.
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "create own posts" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "edit own posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "comments readable" on public.comments for select to authenticated using (true);
create policy "create own comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "delete own comments" on public.comments for delete to authenticated using (author_id = auth.uid());

create policy "likes readable" on public.post_likes for select to authenticated using (true);
create policy "like as yourself" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike your own like" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Blocks: private to the person who blocked. Reports: write-only for users.
create policy "own blocks" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- Direct messages: only the two people in a conversation can read them, and
-- you can't message someone who has blocked you.
create policy "read own conversations" on public.direct_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send as yourself" on public.direct_messages for insert to authenticated
  with check (sender_id = auth.uid() and (recipient_id is null or not public.has_blocked(recipient_id, auth.uid())));
create policy "delete own sent messages" on public.direct_messages for delete to authenticated using (sender_id = auth.uid());

-- Groups: anyone signed in can see members and read group chats; only
-- members can post, and only as themselves.
create policy "members readable" on public.group_members for select to authenticated using (true);
create policy "join as yourself" on public.group_members for insert to authenticated with check (user_id = auth.uid());
create policy "leave as yourself" on public.group_members for delete to authenticated using (user_id = auth.uid());

create policy "group messages readable" on public.group_messages for select to authenticated using (true);
create policy "members post as themselves" on public.group_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.group_members m where m.group_id = group_messages.group_id and m.user_id = auth.uid()));
create policy "delete own group messages" on public.group_messages for delete to authenticated using (sender_id = auth.uid());

-- Rides: private to their owner.
create policy "own rides" on public.rides for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------- photo storage
-- Public bucket for avatars and post photos. Each rider can only upload,
-- replace or delete files inside their own folder: <user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "media upload own folder" on storage.objects;
drop policy if exists "media update own folder" on storage.objects;
drop policy if exists "media delete own folder" on storage.objects;
create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- --------------------------------------------------------------- realtime
-- Live updates for chat and the feed (Row Level Security still applies).
do $$
declare t text;
begin
  foreach t in array array['direct_messages', 'group_messages', 'posts', 'comments'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
