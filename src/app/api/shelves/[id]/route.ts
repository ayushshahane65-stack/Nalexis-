/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: shelf, error } = await (supabase.from("shelves") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  // Privacy check: If not owner and shelf is private -> 403 Forbidden
  if (shelf.user_id !== user?.id && !shelf.is_public) {
    return NextResponse.json({ error: "This shelf is private." }, { status: 403 });
  }

  // Fetch books in this shelf
  const { data: books } = await (supabase.from("shelf_books") as any)
    .select("source, book_id, order_index, created_at")
    .eq("shelf_id", id)
    .order("order_index", { ascending: true });

  return NextResponse.json({
    ...shelf,
    books: books ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check ownership and whether shelf is default
  const { data: shelf } = await (supabase.from("shelves") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  if (shelf.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: You do not own this shelf" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("name" in body) {
      if (shelf.is_default) {
        return NextResponse.json({ error: "Cannot rename system default shelf" }, { status: 400 });
      }
      updates.name = String(body.name).trim();
    }
    if ("description" in body) updates.description = body.description ? String(body.description).trim() : null;
    if ("cover_image" in body) updates.cover_image = body.cover_image ? String(body.cover_image) : null;
    if ("is_public" in body) updates.is_public = Boolean(body.is_public);
    if ("order_index" in body) updates.order_index = Number(body.order_index);

    const { data: updated, error } = await (supabase.from("shelves") as any)
      .update(updates)
      .eq("id", id)
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shelf } = await (supabase.from("shelves") as any)
    .select("is_default, user_id")
    .eq("id", id)
    .single();

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  if (shelf.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (shelf.is_default) {
    return NextResponse.json({ error: "Default system shelves cannot be deleted." }, { status: 400 });
  }

  const { error } = await (supabase.from("shelves") as any).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
