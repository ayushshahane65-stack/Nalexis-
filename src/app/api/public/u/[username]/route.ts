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

  // 3. Fetch ONLY explicitly shared reflections
  const { data: sharedReflections } = await (supabase.from("library_books") as any)
    .select("source, book_id, rating, reflection, finished_at")
    .eq("user_id", userId)
    .eq("is_reflection_shared", true)
    .not("reflection", "is", null)
    .order("finished_at", { ascending: false });

  // 4. Fetch ONLY explicitly shared quotes
  const { data: sharedQuotes } = await (supabase.from("quotes") as any)
    .select("id, source, book_id, text, note, created_at")
    .eq("user_id", userId)
    .eq("is_shared", true)
    .order("created_at", { ascending: false });

  // 5. Compute real public stats (Imported EPUBs count is NEVER exposed)
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

  // 6. Safe public journey milestones (only finished_book & reached_goal)
  const { data: publicJourney } = await (supabase.from("journey_events") as any)
    .select("event_type, source, book_id, created_at")
    .eq("user_id", userId)
    .in("event_type", ["finished_book", "reached_goal"])
    .order("created_at", { ascending: false })
    .limit(15);

  return NextResponse.json({
    profile: {
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      avatar_color: profile.avatar_color,
      favourite_genres: profile.favourite_genres ?? [],
      favourite_authors: profile.favourite_authors ?? [],
      yearly_goal: profile.yearly_goal ?? 12,
      goal_year: profile.goal_year ?? new Date().getFullYear(),
    },
    stats: {
      books_completed: completedCount.count ?? 0,
      shared_quotes: quotesCount.count ?? 0,
    },
    shelves: enrichedPublicShelves,
    reflections: sharedReflections ?? [],
    quotes: sharedQuotes ?? [],
    journey: publicJourney ?? [],
  });
}
