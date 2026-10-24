-- ═══════════════════════════════════════════════════════════════════════════
-- NALEXIS — My Literary Profile Schema Migration
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extend PROFILES table with Literary Identity and Showcase fields
alter table if exists public.profiles
  add column if not exists cover_image text,
  add column if not exists reading_philosophy text,
  add column if not exists literary_interests text[] default '{}'::text[],
  add column if not exists featured_book_source text,
  add column if not exists featured_book_id text,
  add column if not exists featured_book_title text,
  add column if not exists featured_book_author text,
  add column if not exists featured_book_cover text,
  add column if not exists featured_shelf_id uuid references public.shelves(id) on delete set null,
  add column if not exists theme_accent text default 'emerald',
  add column if not exists showcase_currently_reading boolean default true,
  add column if not exists showcase_completed boolean default true,
  add column if not exists showcase_favourites boolean default true,
  add column if not exists showcase_quotes boolean default true,
  add column if not exists showcase_journey boolean default true;

-- 2. Ensure RLS Policy for Public View of Showcase Books
-- Users can view their own library books, OR books marked with shared reflections,
-- OR books showcased on a public profile where owner enabled showcase.
drop policy if exists "Users can view own library books, or shared reflections" on public.library_books;
drop policy if exists "Users can view own or publicly showcased books" on public.library_books;

create policy "Users can view own or publicly showcased books"
  on public.library_books for select
  using (
    auth.uid() = user_id
    or (is_reflection_shared = true and reflection is not null)
    or exists (
      select 1 from public.profiles
      where public.profiles.id = library_books.user_id
        and (
          (public.profiles.showcase_favourites = true and library_books.is_favourite = true)
          or (public.profiles.showcase_currently_reading = true and library_books.status = 'currently_reading')
          or (public.profiles.showcase_completed = true and library_books.status = 'finished')
        )
    )
  );
