/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultShelves, logJourneyEvent } from "@/lib/db/library";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view your library." }, { status: 401 });
  }

  // Ensure default shelves exist for the user
  await ensureDefaultShelves(supabase, user.id);

  const searchParams = req.nextUrl.searchParams;
  const statusFilter = searchParams.get("status") as LibraryBookStatus | null;
  const shelfIdFilter = searchParams.get("shelfId");

  let query = (supabase.from("library_books") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: books, error } = await query;

  if (error) {
    console.error("Failed to load library books:", error.message);
    return NextResponse.json({ error: "Could not load your library." }, { status: 500 });
  }

  // Fetch shelf memberships for these books
  const { data: shelfBooks } = await (supabase.from("shelf_books") as any)
    .select("shelf_id, source, book_id");

  // Map shelf IDs onto books
  const shelfMap = new Map<string, string[]>();
  (shelfBooks ?? []).forEach((sb: any) => {
    const key = `${sb.source}:${sb.book_id}`;
    const list = shelfMap.get(key) ?? [];
    list.push(sb.shelf_id);
    shelfMap.set(key, list);
  });

  let enriched = (books ?? []).map((b: any) => ({
    ...b,
    shelf_ids: shelfMap.get(`${b.source}:${b.book_id}`) ?? [],
  }));

  if (shelfIdFilter) {
    enriched = enriched.filter((b: any) => b.shelf_ids.includes(shelfIdFilter));
  }

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      source,
      book_id,
      status = "want_to_read",
      progress = 0,
      rating = null,
      reflection = null,
      is_reflection_shared = false,
      is_favourite = false,
      shelf_ids = [],
    } = body;

    if (!source || !book_id) {
      return NextResponse.json({ error: "source and book_id are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const started_at = status === "currently_reading" ? now : null;
    const finished_at = status === "finished" ? now : null;

    // Upsert into library_books
    const { data: savedBook, error } = await (supabase.from("library_books") as any)
      .upsert(
        {
          user_id: user.id,
          source: String(source),
          book_id: String(book_id),
          status: status as LibraryBookStatus,
          progress: Number(progress) || 0,
          started_at,
          finished_at,
          rating: rating !== null ? Number(rating) : null,
          reflection: reflection ? String(reflection) : null,
          is_reflection_shared: Boolean(is_reflection_shared),
          is_favourite: Boolean(is_favourite),
          updated_at: now,
        },
        { onConflict: "user_id,source,book_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Library book upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Assign to shelves if provided
    if (Array.isArray(shelf_ids) && shelf_ids.length > 0) {
      for (const shelfId of shelf_ids) {
        await (supabase.from("shelf_books") as any)
          .upsert(
            { shelf_id: shelfId, source: String(source), book_id: String(book_id) },
            { onConflict: "shelf_id,source,book_id" }
          );
      }
    }

    // Log corresponding journey event
    if (status === "currently_reading") {
      await logJourneyEvent(supabase, user.id, "started_book", source, book_id);
    } else if (status === "finished") {
      await logJourneyEvent(supabase, user.id, "finished_book", source, book_id, {
        rating,
        reflection,
      });
    }

    return NextResponse.json(savedBook);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source, book_id, ...updates } = body;

    if (!source || !book_id) {
      return NextResponse.json({ error: "source and book_id are required" }, { status: 400 });
    }

    // Check existing book to log status transition
    const { data: existing } = await (supabase.from("library_books") as any)
      .select("status, progress")
      .eq("user_id", user.id)
      .eq("source", source)
      .eq("book_id", book_id)
      .single();

    const now = new Date().toISOString();
    const patchPayload: Record<string, unknown> = {
      updated_at: now,
    };

    if ("status" in updates) {
      patchPayload.status = updates.status;
      if (updates.status === "currently_reading" && !existing?.status) {
        patchPayload.started_at = now;
      } else if (updates.status === "finished") {
        patchPayload.finished_at = now;
        patchPayload.progress = 100;
      }
    }
    if ("progress" in updates) patchPayload.progress = Math.min(100, Math.max(0, Number(updates.progress)));
    if ("rating" in updates) patchPayload.rating = updates.rating !== null ? Number(updates.rating) : null;
    if ("reflection" in updates) patchPayload.reflection = updates.reflection ? String(updates.reflection) : null;
    if ("is_reflection_shared" in updates) patchPayload.is_reflection_shared = Boolean(updates.is_reflection_shared);
    if ("is_favourite" in updates) patchPayload.is_favourite = Boolean(updates.is_favourite);

    const { data: updated, error } = await (supabase.from("library_books") as any)
      .update(patchPayload)
      .eq("user_id", user.id)
      .eq("source", source)
      .eq("book_id", book_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if status changed to log event
    if (updates.status && updates.status !== existing?.status) {
      if (updates.status === "currently_reading") {
        await logJourneyEvent(supabase, user.id, "started_book", source, book_id);
      } else if (updates.status === "finished") {
        await logJourneyEvent(supabase, user.id, "finished_book", source, book_id, {
          rating: updated.rating,
          reflection: updated.reflection,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source");
  const book_id = searchParams.get("bookId");

  if (!source || !book_id) {
    return NextResponse.json({ error: "source and bookId are required" }, { status: 400 });
  }

  // Delete from library_books
  const { error } = await (supabase.from("library_books") as any)
    .delete()
    .eq("user_id", user.id)
    .eq("source", source)
    .eq("book_id", book_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also remove from user's shelf_books
  const { data: userShelves } = await (supabase.from("shelves") as any)
    .select("id")
    .eq("user_id", user.id);

  if (userShelves && userShelves.length > 0) {
    const shelfIds = userShelves.map((s: any) => s.id);
    await (supabase.from("shelf_books") as any)
      .delete()
      .in("shelf_id", shelfIds)
      .eq("source", source)
      .eq("book_id", book_id);
  }

  return NextResponse.json({ success: true });
}
