/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logJourneyEvent } from "@/lib/db/library";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source");
  const bookId = searchParams.get("bookId");

  let query = (supabase.from("quotes") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (source && bookId) {
    query = query.eq("source", source).eq("book_id", bookId);
  }

  const { data: quotes, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(quotes ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { source, book_id, text, note = null, is_shared = false } = await req.json();

    if (!source || !book_id || !text || !text.trim()) {
      return NextResponse.json({ error: "source, book_id, and text are required" }, { status: 400 });
    }

    const { data: quote, error } = await (supabase.from("quotes") as any)
      .insert({
        user_id: user.id,
        source: String(source),
        book_id: String(book_id),
        text: String(text).trim(),
        note: note ? String(note).trim() : null,
        is_shared: Boolean(is_shared), // Default is private (false)
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logJourneyEvent(supabase, user.id, "saved_quote", source, book_id, {
      quote_id: quote.id,
      preview: quote.text.slice(0, 80),
    });

    return NextResponse.json(quote);
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
    const { id, note, is_shared, text } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "quote id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (note !== undefined) updates.note = note ? String(note).trim() : null;
    if (is_shared !== undefined) updates.is_shared = Boolean(is_shared);
    if (text !== undefined && text.trim()) updates.text = String(text).trim();

    const { data: quote, error } = await (supabase.from("quotes") as any)
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(quote);
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
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await (supabase.from("quotes") as any)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
