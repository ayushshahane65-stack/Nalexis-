-- ═══════════════════════════════════════════════════════════════════════════
-- NALEXIS — Living Library & Profile Schema Extension
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extend PROFILES table with Living Library fields
alter table if exists public.profiles
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists favourite_genres text[] default '{}'::text[],
  add column if not exists favourite_authors text[] default '{}'::text[],
  add column if not exists yearly_goal int default 12,
  add column if not exists goal_year int default extract(year from now())::int;

-- 2. LIBRARY_BOOKS (Private user book tracking for API books)
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

-- 3. SHELVES (Default and custom shelves)
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

-- 4. SHELF_BOOKS (Many-to-many relationship: books in shelves)
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

-- 5. QUOTES (Private by default, can be explicitly shared)
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

-- 6. JOURNEY_EVENTS (Reading journey timeline)
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

-- 7. Triggers for updated_at
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
