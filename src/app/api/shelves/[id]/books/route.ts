/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logJourneyEvent } from "@/lib/db/library";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: shelfId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify shelf ownership
  const { data: shelf } = await (supabase.from("shelves") as any)
    .select("id, name, user_id")
    .eq("id", shelfId)
    .single();

  if (!shelf || shelf.user_id !== user.id) {
    return NextResponse.json({ error: "Shelf not found or forbidden" }, { status: 403 });
  }

  try {
    const { source, book_id } = await req.json();
    if (!source || !book_id) {
      return NextResponse.json({ error: "source and book_id are required" }, { status: 400 });
    }

    // Get current highest order in shelf
    const { data: existing } = await (supabase.from("shelf_books") as any)
      .select("order_index")
      .eq("shelf_id", shelfId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].order_index ?? 0) + 1 : 0;

    const { data: entry, error } = await (supabase.from("shelf_books") as any)
      .upsert(
        {
          shelf_id: shelfId,
          source: String(source),
          book_id: String(book_id),
          order_index: nextOrder,
        },
        { onConflict: "shelf_id,source,book_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logJourneyEvent(supabase, user.id, "added_to_shelf", source, book_id, {
      shelf_name: shelf.name,
      shelf_id: shelf.id,
    });

    return NextResponse.json(entry);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: shelfId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify shelf ownership
  const { data: shelf } = await (supabase.from("shelves") as any)
    .select("user_id")
    .eq("id", shelfId)
    .single();

  if (!shelf || shelf.user_id !== user.id) {
    return NextResponse.json({ error: "Shelf not found or forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source");
  const book_id = searchParams.get("bookId");

  if (!source || !book_id) {
    return NextResponse.json({ error: "source and bookId are required" }, { status: 400 });
  }

  const { error } = await (supabase.from("shelf_books") as any)
    .delete()
    .eq("shelf_id", shelfId)
    .eq("source", source)
    .eq("book_id", book_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id: shelfId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify shelf ownership
  const { data: shelf } = await (supabase.from("shelves") as any)
    .select("user_id")
    .eq("id", shelfId)
    .single();

  if (!shelf || shelf.user_id !== user.id) {
    return NextResponse.json({ error: "Shelf not found or forbidden" }, { status: 403 });
  }

  try {
    const { ordered_books } = await req.json(); // Array of { source, book_id }
    if (!Array.isArray(ordered_books)) {
      return NextResponse.json({ error: "ordered_books array required" }, { status: 400 });
    }

    for (let i = 0; i < ordered_books.length; i++) {
      const b = ordered_books[i];
      await (supabase.from("shelf_books") as any)
        .update({ order_index: i })
        .eq("shelf_id", shelfId)
        .eq("source", b.source)
        .eq("book_id", b.book_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
