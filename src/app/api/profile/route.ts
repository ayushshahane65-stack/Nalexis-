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
  const [completedRes, readingRes, quotesRes] = await Promise.all([
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
  ]);

  const stats = {
    books_completed: completedRes.count ?? 0,
    currently_reading: readingRes.count ?? 0,
    saved_quotes: quotesRes.count ?? 0,
  };

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    profile: profile ?? {
      id: user.id,
      display_name: user.user_metadata?.display_name ?? null,
      username: null,
      bio: null,
      avatar_url: null,
      avatar_color: "#3F5F52",
      favourite_genres: [],
      favourite_authors: [],
      yearly_goal: 12,
      goal_year: new Date().getFullYear(),
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
    if ("favourite_genres" in body && Array.isArray(body.favourite_genres)) {
      updates.favourite_genres = body.favourite_genres.map(String);
    }
    if ("favourite_authors" in body && Array.isArray(body.favourite_authors)) {
      updates.favourite_authors = body.favourite_authors.map(String);
    }
    if ("yearly_goal" in body) {
      const goal = Math.max(1, Math.min(365, Number(body.yearly_goal) || 12));
      updates.yearly_goal = goal;
    }
    if ("goal_year" in body) {
      updates.goal_year = Number(body.goal_year) || new Date().getFullYear();
    }

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
