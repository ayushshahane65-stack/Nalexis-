/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultShelves, logJourneyEvent } from "@/lib/db/library";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultShelves(supabase, user.id);

  const searchParams = req.nextUrl.searchParams;
  const includeBooks = searchParams.get("includeBooks") === "true";

  // Fetch all shelves for the user ordered by order_index
  const { data: shelves, error } = await (supabase.from("shelves") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Shelves fetch error:", error.message);
    return NextResponse.json({ error: "Could not load shelves" }, { status: 500 });
  }

  // Fetch shelf books for counts or inclusion
  const shelfIds = (shelves ?? []).map((s: any) => s.id);
  const { data: shelfBooks } = await (supabase.from("shelf_books") as any)
    .select("shelf_id, source, book_id, order_index")
    .in("shelf_id", shelfIds)
    .order("order_index", { ascending: true });

  const bookMap = new Map<string, Array<{ source: string; book_id: string; order_index: number }>>();
  (shelfBooks ?? []).forEach((sb: any) => {
    const list = bookMap.get(sb.shelf_id) ?? [];
    list.push({ source: sb.source, book_id: sb.book_id, order_index: sb.order_index });
    bookMap.set(sb.shelf_id, list);
  });

  const enriched = (shelves ?? []).map((shelf: any) => {
    const books = bookMap.get(shelf.id) ?? [];
    return {
      ...shelf,
      book_count: books.length,
      books: includeBooks ? books : undefined,
    };
  });

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
    const { name, description = null, cover_image = null, is_public = false, initial_books = [] } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Shelf name is required" }, { status: 400 });
    }

    // Get current max order_index
    const { data: existing } = await (supabase.from("shelves") as any)
      .select("order_index")
      .eq("user_id", user.id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].order_index ?? 0) + 1 : 10;

    const { data: shelf, error } = await (supabase.from("shelves") as any)
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description ? String(description).trim() : null,
        cover_image: cover_image ? String(cover_image) : null,
        is_public: Boolean(is_public), // New shelves default to private unless explicitly requested
        is_default: false,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add initial books if provided
    if (Array.isArray(initial_books) && initial_books.length > 0) {
      const booksToInsert = initial_books.map((b: any, idx: number) => ({
        shelf_id: shelf.id,
        source: String(b.source),
        book_id: String(b.book_id),
        order_index: idx,
      }));
      await (supabase.from("shelf_books") as any).insert(booksToInsert);

      for (const b of initial_books) {
        await logJourneyEvent(supabase, user.id, "added_to_shelf", b.source, b.book_id, {
          shelf_name: shelf.name,
          shelf_id: shelf.id,
        });
      }
    }

    return NextResponse.json(shelf);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
