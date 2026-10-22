-- ═══════════════════════════════════════════════════════════════════════════
-- NALEXIS — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- One row per auth.users entry, created automatically on sign-up

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique,
  display_name    text,
  avatar_color    text not null default '#3F5F52',
  reading_goal    int  not null default 12,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view any profile"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    '#3F5F52'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── AUTHORS ─────────────────────────────────────────────────────────────────

create table if not exists public.authors (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,
  born            text,
  nationality     text,
  bio             text not null default '',
  long_bio        text,
  philosophy      text,
  book_count      int  not null default 0,
  cover_color     text not null default '#3F5F52',
  cover_color_alt text not null default '#2E5040',
  verified        boolean not null default true,
  spotlight       boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.authors enable row level security;

create policy "Authors are publicly readable"
  on public.authors for select using (true);

create policy "Only service role can insert authors"
  on public.authors for insert with check (auth.role() = 'service_role');

create policy "Only service role can update authors"
  on public.authors for update using (auth.role() = 'service_role');

create index if not exists authors_slug_idx on public.authors(slug);

-- ─── AUTHOR FOLLOWS ──────────────────────────────────────────────────────────

create table if not exists public.author_follows (
  id         uuid primary key default uuid_generate_v4(),
  author_id  uuid not null references public.authors(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(author_id, user_id)
);

alter table public.author_follows enable row level security;

create policy "Users can view all follows"
  on public.author_follows for select using (true);

create policy "Users can follow authors"
  on public.author_follows for insert with check (auth.uid() = user_id);

create policy "Users can unfollow authors"
  on public.author_follows for delete using (auth.uid() = user_id);

-- ─── SHELF ENTRIES ───────────────────────────────────────────────────────────

create table if not exists public.shelf_entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  book_id         text not null,
  book_source     text not null,
  status          text not null check (status in ('reading','finished','to-read','favourites','paused')),
  current_page    int,
  personal_rating int check (personal_rating between 1 and 5),
  note            text,
  started_at      date,
  finished_at     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, book_source, book_id, status)
);

alter table public.shelf_entries drop constraint if exists shelf_entries_book_id_fkey;
alter table public.shelf_entries drop constraint if exists shelf_entries_user_id_book_id_status_key;
alter table public.shelf_entries add column if not exists book_source text;
alter table public.shelf_entries drop constraint if exists shelf_entries_book_source_check;
alter table public.shelf_entries add constraint shelf_entries_book_source_check
  check (book_source is null or book_source in ('gutenberg','openlibrary','oapen','doab'));
create unique index if not exists shelf_user_source_book_status_idx
  on public.shelf_entries(user_id, book_source, book_id, status);

alter table public.shelf_entries enable row level security;

create policy "Users can view own shelf"
  on public.shelf_entries for select using (auth.uid() = user_id);

create policy "Users can insert into own shelf"
  on public.shelf_entries for insert with check (auth.uid() = user_id);

create policy "Users can update own shelf entries"
  on public.shelf_entries for update using (auth.uid() = user_id);

create policy "Users can delete own shelf entries"
  on public.shelf_entries for delete using (auth.uid() = user_id);

create index if not exists shelf_user_idx   on public.shelf_entries(user_id);
create index if not exists shelf_book_idx   on public.shelf_entries(book_id);
create index if not exists shelf_status_idx on public.shelf_entries(status);

-- ─── READING GOALS ───────────────────────────────────────────────────────────

create table if not exists public.reading_goals (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  year       int  not null,
  target     int  not null default 12,
  progress   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year)
);

alter table public.reading_goals enable row level security;

create policy "Users can view own reading goals"
  on public.reading_goals for select using (auth.uid() = user_id);

create policy "Users can insert own reading goals"
  on public.reading_goals for insert with check (auth.uid() = user_id);

create policy "Users can update own reading goals"
  on public.reading_goals for update using (auth.uid() = user_id);

-- ─── COMMUNITIES ─────────────────────────────────────────────────────────────

create table if not exists public.communities (
  id           uuid primary key default uuid_generate_v4(),
  book_id      text not null,
  book_source  text,
  member_count int  not null default 0,
  post_count   int  not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.communities drop constraint if exists communities_book_id_fkey;
alter table public.communities drop constraint if exists communities_book_id_key;
alter table public.communities add column if not exists book_source text;
alter table public.communities drop constraint if exists communities_book_source_check;
alter table public.communities add constraint communities_book_source_check
  check (book_source is null or book_source in ('gutenberg','openlibrary','oapen','doab'));
create unique index if not exists communities_source_book_idx
  on public.communities(book_source, book_id);

alter table public.communities enable row level security;

create policy "Communities are publicly readable"
  on public.communities for select using (true);

create policy "Service role can manage communities"
  on public.communities for all using (auth.role() = 'service_role');

-- ─── COMMUNITY MEMBERS ───────────────────────────────────────────────────────

create table if not exists public.community_members (
  id           uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  unique(community_id, user_id)
);

alter table public.community_members enable row level security;

create policy "Members are publicly visible"
  on public.community_members for select using (true);

create policy "Users can join communities"
  on public.community_members for insert with check (auth.uid() = user_id);

create policy "Users can leave communities"
  on public.community_members for delete using (auth.uid() = user_id);

-- Auto-update member_count
create or replace function public.update_community_member_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif (tg_op = 'DELETE') then
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_member_count_trigger on public.community_members;
create trigger community_member_count_trigger
  after insert or delete on public.community_members
  for each row execute procedure public.update_community_member_count();

-- ─── DISCUSSION POSTS ────────────────────────────────────────────────────────

create table if not exists public.discussion_posts (
  id           uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  tab          text not null check (tab in ('chapters','themes','reviews','quotes','questions','theories','resources')),
  title        text not null,
  body         text not null,
  like_count   int  not null default 0,
  reply_count  int  not null default 0,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.discussion_posts enable row level security;

create policy "Posts are publicly readable"
  on public.discussion_posts for select using (true);

create policy "Authenticated users can post"
  on public.discussion_posts for insert with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.discussion_posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.discussion_posts for delete using (auth.uid() = user_id);

create index if not exists posts_community_idx on public.discussion_posts(community_id);
create index if not exists posts_tab_idx       on public.discussion_posts(tab);
create index if not exists posts_created_idx   on public.discussion_posts(created_at desc);

-- Auto-update post_count on communities
create or replace function public.update_community_post_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.communities set post_count = post_count + 1 where id = new.community_id;
  elsif (tg_op = 'DELETE') then
    update public.communities set post_count = greatest(post_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end;
$$;

drop trigger if exists community_post_count_trigger on public.discussion_posts;
create trigger community_post_count_trigger
  after insert or delete on public.discussion_posts
  for each row execute procedure public.update_community_post_count();

-- ─── POST LIKES ──────────────────────────────────────────────────────────────

create table if not exists public.post_likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.discussion_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Likes are publicly visible"
  on public.post_likes for select using (true);

create policy "Users can like posts"
  on public.post_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete using (auth.uid() = user_id);

-- Auto-update like_count
create or replace function public.update_post_like_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.discussion_posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.discussion_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_like_count_trigger on public.post_likes;
create trigger post_like_count_trigger
  after insert or delete on public.post_likes
  for each row execute procedure public.update_post_like_count();

-- ─── READING CIRCLES ─────────────────────────────────────────────────────────

create table if not exists public.reading_circles (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  description       text,
  book_id           text not null,
  book_source       text,
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  is_public         boolean not null default true,
  member_count      int  not null default 1,
  current_page_goal int,
  created_at        timestamptz not null default now()
);

alter table public.reading_circles drop constraint if exists reading_circles_book_id_fkey;
alter table public.reading_circles add column if not exists book_source text;
alter table public.reading_circles drop constraint if exists reading_circles_book_source_check;
alter table public.reading_circles add constraint reading_circles_book_source_check
  check (book_source is null or book_source in ('gutenberg','openlibrary','oapen','doab'));

alter table public.reading_circles enable row level security;

create policy "Public circles are visible to all"
  on public.reading_circles for select
  using (is_public = true or owner_id = auth.uid());

create policy "Authenticated users can create circles"
  on public.reading_circles for insert with check (auth.uid() = owner_id);

create policy "Owners can update their circles"
  on public.reading_circles for update using (auth.uid() = owner_id);

create policy "Owners can delete their circles"
  on public.reading_circles for delete using (auth.uid() = owner_id);

-- ─── CIRCLE MEMBERS ──────────────────────────────────────────────────────────

create table if not exists public.circle_members (
  id           uuid primary key default uuid_generate_v4(),
  circle_id    uuid not null references public.reading_circles(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  current_page int  not null default 0,
  joined_at    timestamptz not null default now(),
  unique(circle_id, user_id)
);

alter table public.circle_members enable row level security;

create policy "Circle members can view membership"
  on public.circle_members for select using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_members.circle_id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.reading_circles rc
      where rc.id = circle_members.circle_id and rc.is_public = true
    )
  );

create policy "Users can join circles"
  on public.circle_members for insert with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.circle_members for update using (auth.uid() = user_id);

create policy "Users can leave circles"
  on public.circle_members for delete using (auth.uid() = user_id);

-- Auto-update circle member_count
create or replace function public.update_circle_member_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.reading_circles set member_count = member_count + 1 where id = new.circle_id;
  elsif (tg_op = 'DELETE') then
    update public.reading_circles set member_count = greatest(member_count - 1, 0) where id = old.circle_id;
  end if;
  return null;
end;
$$;

drop trigger if exists circle_member_count_trigger on public.circle_members;
create trigger circle_member_count_trigger
  after insert or delete on public.circle_members
  for each row execute procedure public.update_circle_member_count();

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at      on public.profiles;
drop trigger if exists shelf_entries_updated_at  on public.shelf_entries;
drop trigger if exists reading_goals_updated_at  on public.reading_goals;
drop trigger if exists discussion_posts_updated_at on public.discussion_posts;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger shelf_entries_updated_at
  before update on public.shelf_entries
  for each row execute procedure public.set_updated_at();

create trigger reading_goals_updated_at
  before update on public.reading_goals
  for each row execute procedure public.set_updated_at();

create trigger discussion_posts_updated_at
  before update on public.discussion_posts
  for each row execute procedure public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- LIVING LIBRARY & PROFILE EXTENSION
-- ═══════════════════════════════════════════════════════════════════════════

alter table if exists public.profiles
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists favourite_genres text[] default '{}'::text[],
  add column if not exists favourite_authors text[] default '{}'::text[],
  add column if not exists yearly_goal int default 12,
  add column if not exists goal_year int default extract(year from now())::int;

create table if not exists public.library_books (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  source               text not null,
  book_id              text not null,
  status               text not null check (status in ('currently_reading', 'finished', 'paused', 'dropped', 'want_to_read')),
  progress             int not null default 0 check (progress >= 0 and progress <= 100),
  started_at           timestamptz,
  finished_at          timestamptz,
  rating               int check (rating is null or (rating >= 1 and rating <= 5)),
  reflection           text,
  is_reflection_shared boolean not null default false,
  is_favourite         boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint library_books_user_book_key unique (user_id, source, book_id)
);

create index if not exists idx_library_books_user on public.library_books (user_id);
create index if not exists idx_library_books_user_status on public.library_books (user_id, status);

alter table public.library_books enable row level security;

create policy "Users can view own library books, or shared reflections"
  on public.library_books for select
  using (auth.uid() = user_id or (is_reflection_shared = true and reflection is not null));

create policy "Users can insert own library books"
  on public.library_books for insert
  with check (auth.uid() = user_id);

create policy "Users can update own library books"
  on public.library_books for update
  using (auth.uid() = user_id);

create policy "Users can delete own library books"
  on public.library_books for delete
  using (auth.uid() = user_id);

create table if not exists public.shelves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  cover_image text,
  is_public   boolean not null default false,
  order_index int not null default 0,
  is_default  boolean not null default false,
  slug        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_shelves_user on public.shelves (user_id);
create index if not exists idx_shelves_user_order on public.shelves (user_id, order_index);

alter table public.shelves enable row level security;

create policy "Users can view own shelves or public shelves"
  on public.shelves for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users can insert own shelves"
  on public.shelves for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shelves"
  on public.shelves for update
  using (auth.uid() = user_id);

create policy "Users can delete own non-default shelves"
  on public.shelves for delete
  using (auth.uid() = user_id and is_default = false);

create table if not exists public.shelf_books (
  id          uuid primary key default gen_random_uuid(),
  shelf_id    uuid not null references public.shelves(id) on delete cascade,
  source      text not null,
  book_id     text not null,
  order_index int not null default 0,
  created_at  timestamptz not null default now(),
  constraint shelf_books_shelf_book_key unique (shelf_id, source, book_id)
);

create index if not exists idx_shelf_books_shelf on public.shelf_books (shelf_id);
create index if not exists idx_shelf_books_order on public.shelf_books (shelf_id, order_index);

alter table public.shelf_books enable row level security;

create policy "Users can view shelf books if shelf is viewable"
  on public.shelf_books for select
  using (
    exists (
      select 1 from public.shelves
      where public.shelves.id = shelf_books.shelf_id
        and (public.shelves.user_id = auth.uid() or public.shelves.is_public = true)
    )
  );

create policy "Users can insert books into own shelves"
  on public.shelf_books for insert
  with check (
    exists (
      select 1 from public.shelves
      where public.shelves.id = shelf_books.shelf_id
        and public.shelves.user_id = auth.uid()
    )
  );

create policy "Users can update order in own shelves"
  on public.shelf_books for update
  using (
    exists (
      select 1 from public.shelves
      where public.shelves.id = shelf_books.shelf_id
        and public.shelves.user_id = auth.uid()
    )
  );

create policy "Users can delete books from own shelves"
  on public.shelf_books for delete
  using (
    exists (
      select 1 from public.shelves
      where public.shelves.id = shelf_books.shelf_id
        and public.shelves.user_id = auth.uid()
    )
  );

create table if not exists public.quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null,
  book_id     text not null,
  text        text not null,
  note        text,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_quotes_user on public.quotes (user_id);
create index if not exists idx_quotes_user_book on public.quotes (user_id, source, book_id);

alter table public.quotes enable row level security;

create policy "Users can view own quotes or shared quotes"
  on public.quotes for select
  using (auth.uid() = user_id or is_shared = true);

create policy "Users can insert own quotes"
  on public.quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quotes"
  on public.quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete own quotes"
  on public.quotes for delete
  using (auth.uid() = user_id);

create table if not exists public.journey_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null check (event_type in ('started_book', 'finished_book', 'added_to_shelf', 'saved_quote', 'reached_goal', 'explored_genre')),
  source      text,
  book_id     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_journey_events_user on public.journey_events (user_id, created_at desc);

alter table public.journey_events enable row level security;

create policy "Users can view own journey events or public profile events"
  on public.journey_events for select
  using (true);

create policy "Users can insert own journey events"
  on public.journey_events for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own journey events"
  on public.journey_events for delete
  using (auth.uid() = user_id);

drop trigger if exists library_books_updated_at on public.library_books;
create trigger library_books_updated_at
  before update on public.library_books
  for each row execute procedure public.set_updated_at();

drop trigger if exists shelves_updated_at on public.shelves;
create trigger shelves_updated_at
  before update on public.shelves
  for each row execute procedure public.set_updated_at();

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();

