/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username).trim().toLowerCase();

  const supabase = await createClient();

  // Find profile by username (or by id if formatted as uuid)
  let query = (supabase.from("profiles") as any).select("*");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedUsername);

  if (isUuid) {
    query = query.eq("id", decodedUsername);
  } else {
    query = query.ilike("username", decodedUsername);
  }

  const { data: profile, error } = await query.single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const userId = profile.id;

  // 1. Fetch ONLY public shelves
  const { data: publicShelves } = await (supabase.from("shelves") as any)
    .select("id, name, description, cover_image, order_index, is_default, slug, created_at")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("order_index", { ascending: true });

  const shelfIds = (publicShelves ?? []).map((s: any) => s.id);

  // 2. Fetch books only in those public shelves
  let publicShelfBooks: Array<{ shelf_id: string; source: string; book_id: string; order_index: number }> = [];
  if (shelfIds.length > 0) {
    const { data: books } = await (supabase.from("shelf_books") as any)
      .select("shelf_id, source, book_id, order_index")
      .in("shelf_id", shelfIds)
      .order("order_index", { ascending: true });
    publicShelfBooks = books ?? [];
  }

  const shelfBooksMap = new Map<string, Array<{ source: string; book_id: string; order_index: number }>>();
  publicShelfBooks.forEach((sb: any) => {
    const list = shelfBooksMap.get(sb.shelf_id) ?? [];
    list.push({ source: sb.source, book_id: sb.book_id, order_index: sb.order_index });
    shelfBooksMap.set(sb.shelf_id, list);
  });

  const enrichedPublicShelves = (publicShelves ?? []).map((shelf: any) => ({
    ...shelf,
    book_count: (shelfBooksMap.get(shelf.id) ?? []).length,
    books: shelfBooksMap.get(shelf.id) ?? [],
  }));

  // 3. Showcase Books according to user privacy flags
  const showcaseFavourites = profile.showcase_favourites ?? true;
  const showcaseReading = profile.showcase_currently_reading ?? true;
  const showcaseCompleted = profile.showcase_completed ?? true;

  let favouriteBooks: any[] = [];
  let currentlyReadingBooks: any[] = [];
  let completedBooks: any[] = [];

  if (showcaseFavourites) {
    const { data: favs } = await (supabase.from("library_books") as any)
      .select("source, book_id, rating, is_favourite, created_at")
      .eq("user_id", userId)
      .eq("is_favourite", true)
      .limit(12);
    favouriteBooks = favs ?? [];
  }

  if (showcaseReading) {
    const { data: reading } = await (supabase.from("library_books") as any)
      .select("source, book_id, progress, started_at")
      .eq("user_id", userId)
      .eq("status", "currently_reading")
      .order("started_at", { ascending: false })
      .limit(8);
    currentlyReadingBooks = reading ?? [];
  }

  if (showcaseCompleted) {
    const { data: finished } = await (supabase.from("library_books") as any)
      .select("source, book_id, rating, finished_at")
      .eq("user_id", userId)
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(12);
    completedBooks = finished ?? [];
  }

  // 4. Fetch ONLY explicitly shared reflections
  const { data: sharedReflections } = await (supabase.from("library_books") as any)
    .select("source, book_id, rating, reflection, finished_at")
    .eq("user_id", userId)
    .eq("is_reflection_shared", true)
    .not("reflection", "is", null)
    .order("finished_at", { ascending: false });

  // 5. Fetch ONLY explicitly shared quotes (if showcase_quotes is enabled)
  let sharedQuotes: any[] = [];
  if (profile.showcase_quotes ?? true) {
    const { data: quotes } = await (supabase.from("quotes") as any)
      .select("id, source, book_id, text, note, created_at")
      .eq("user_id", userId)
      .eq("is_shared", true)
      .order("created_at", { ascending: false });
    sharedQuotes = quotes ?? [];
  }

  // 6. Compute real public stats
  const [completedCount, quotesCount] = await Promise.all([
    (supabase.from("library_books") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "finished"),
    (supabase.from("quotes") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_shared", true),
  ]);

  // 7. Safe public journey milestones (if showcase_journey is enabled)
  let publicJourney: any[] = [];
  if (profile.showcase_journey ?? true) {
    const { data: journey } = await (supabase.from("journey_events") as any)
      .select("event_type, source, book_id, created_at")
      .eq("user_id", userId)
      .in("event_type", ["finished_book", "reached_goal", "saved_quote"])
      .order("created_at", { ascending: false })
      .limit(15);
    publicJourney = journey ?? [];
  }

  return NextResponse.json({
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      avatar_color: profile.avatar_color ?? "#3F5F52",
      cover_image: profile.cover_image ?? null,
      reading_philosophy: profile.reading_philosophy ?? null,
      literary_interests: profile.literary_interests ?? [],
      favourite_genres: profile.favourite_genres ?? [],
      favourite_authors: profile.favourite_authors ?? [],
      yearly_goal: profile.yearly_goal ?? 12,
      goal_year: profile.goal_year ?? new Date().getFullYear(),
      featured_book: profile.featured_book_title ? {
        source: profile.featured_book_source,
        id: profile.featured_book_id,
        title: profile.featured_book_title,
        author: profile.featured_book_author,
        cover: profile.featured_book_cover,
      } : null,
      featured_shelf_id: profile.featured_shelf_id ?? null,
      theme_accent: profile.theme_accent ?? "emerald",
      showcase_flags: {
        favourites: showcaseFavourites,
        currently_reading: showcaseReading,
        completed: showcaseCompleted,
        quotes: profile.showcase_quotes ?? true,
        journey: profile.showcase_journey ?? true,
      },
    },
    stats: {
      books_completed: completedCount.count ?? 0,
      public_shelves: enrichedPublicShelves.length,
      shared_quotes: quotesCount.count ?? 0,
      favourite_books: favouriteBooks.length,
    },
    shelves: enrichedPublicShelves,
    showcase: {
      favourites: favouriteBooks,
      currently_reading: currentlyReadingBooks,
      completed: completedBooks,
    },
    reflections: sharedReflections ?? [],
    quotes: sharedQuotes,
    journey: publicJourney,
  });
}
