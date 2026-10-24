/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Profile load error:", error.message);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  // Calculate real stats from database
  const [completedRes, readingRes, quotesRes, favouritesRes] = await Promise.all([
    (supabase.from("library_books") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "finished"),
    (supabase.from("library_books") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "currently_reading"),
    (supabase.from("quotes") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    (supabase.from("library_books") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_favourite", true),
  ]);

  const stats = {
    books_completed: completedRes.count ?? 0,
    currently_reading: readingRes.count ?? 0,
    saved_quotes: quotesRes.count ?? 0,
    favourite_books: favouritesRes.count ?? 0,
  };

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    profile: {
      id: user.id,
      display_name: profile?.display_name ?? user.user_metadata?.display_name ?? null,
      username: profile?.username ?? null,
      bio: profile?.bio ?? null,
      avatar_url: profile?.avatar_url ?? null,
      avatar_color: profile?.avatar_color ?? "#3F5F52",
      cover_image: profile?.cover_image ?? null,
      reading_philosophy: profile?.reading_philosophy ?? null,
      literary_interests: profile?.literary_interests ?? [],
      favourite_genres: profile?.favourite_genres ?? [],
      favourite_authors: profile?.favourite_authors ?? [],
      yearly_goal: profile?.yearly_goal ?? 12,
      goal_year: profile?.goal_year ?? new Date().getFullYear(),
      featured_book_source: profile?.featured_book_source ?? null,
      featured_book_id: profile?.featured_book_id ?? null,
      featured_book_title: profile?.featured_book_title ?? null,
      featured_book_author: profile?.featured_book_author ?? null,
      featured_book_cover: profile?.featured_book_cover ?? null,
      featured_shelf_id: profile?.featured_shelf_id ?? null,
      theme_accent: profile?.theme_accent ?? "emerald",
      showcase_currently_reading: profile?.showcase_currently_reading ?? true,
      showcase_completed: profile?.showcase_completed ?? true,
      showcase_favourites: profile?.showcase_favourites ?? true,
      showcase_quotes: profile?.showcase_quotes ?? true,
      showcase_journey: profile?.showcase_journey ?? true,
    },
    stats,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("display_name" in body) updates.display_name = body.display_name ? String(body.display_name).trim() : null;
    if ("username" in body) {
      const username = body.username ? String(body.username).trim().toLowerCase() : null;
      if (username) {
        // Validate alphanumeric + underscore/hyphen
        if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
          return NextResponse.json({ error: "Username must be 3-30 letters, numbers, hyphens or underscores." }, { status: 400 });
        }
        // Check uniqueness if changed
        const { data: existingUser } = await (supabase.from("profiles") as any)
          .select("id")
          .eq("username", username)
          .neq("id", user.id)
          .single();

        if (existingUser) {
          return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
        }
        updates.username = username;
      }
    }
    if ("bio" in body) updates.bio = body.bio ? String(body.bio).trim() : null;
    if ("avatar_url" in body) updates.avatar_url = body.avatar_url ? String(body.avatar_url).trim() : null;
    if ("avatar_color" in body) updates.avatar_color = String(body.avatar_color);
    if ("cover_image" in body) updates.cover_image = body.cover_image ? String(body.cover_image).trim() : null;
    if ("reading_philosophy" in body) updates.reading_philosophy = body.reading_philosophy ? String(body.reading_philosophy).trim() : null;

    if ("literary_interests" in body && Array.isArray(body.literary_interests)) {
      updates.literary_interests = body.literary_interests.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
    if ("favourite_genres" in body && Array.isArray(body.favourite_genres)) {
      updates.favourite_genres = body.favourite_genres.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
    if ("favourite_authors" in body && Array.isArray(body.favourite_authors)) {
      updates.favourite_authors = body.favourite_authors.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
    if ("yearly_goal" in body) {
      const goal = Math.max(1, Math.min(365, Number(body.yearly_goal) || 12));
      updates.yearly_goal = goal;
    }
    if ("goal_year" in body) {
      updates.goal_year = Number(body.goal_year) || new Date().getFullYear();
    }

    if ("featured_book_source" in body) updates.featured_book_source = body.featured_book_source ?? null;
    if ("featured_book_id" in body) updates.featured_book_id = body.featured_book_id ?? null;
    if ("featured_book_title" in body) updates.featured_book_title = body.featured_book_title ?? null;
    if ("featured_book_author" in body) updates.featured_book_author = body.featured_book_author ?? null;
    if ("featured_book_cover" in body) updates.featured_book_cover = body.featured_book_cover ?? null;
    if ("featured_shelf_id" in body) updates.featured_shelf_id = body.featured_shelf_id ?? null;
    if ("theme_accent" in body) updates.theme_accent = String(body.theme_accent || "emerald");

    if ("showcase_currently_reading" in body) updates.showcase_currently_reading = Boolean(body.showcase_currently_reading);
    if ("showcase_completed" in body) updates.showcase_completed = Boolean(body.showcase_completed);
    if ("showcase_favourites" in body) updates.showcase_favourites = Boolean(body.showcase_favourites);
    if ("showcase_quotes" in body) updates.showcase_quotes = Boolean(body.showcase_quotes);
    if ("showcase_journey" in body) updates.showcase_journey = Boolean(body.showcase_journey);

    const { data: updated, error } = await (supabase.from("profiles") as any)
      .upsert({
        id: user.id,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
