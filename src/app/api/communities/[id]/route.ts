import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookDetails } from "@/lib/book-details";
import type { BookSource } from "@/lib/books";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .select("id, book_id, book_source, member_count, post_count")
    .eq("id", id)
    .single();
  const community = data as { id: string; book_id: string; book_source: BookSource | null; member_count: number; post_count: number } | null;
  if (error || !community?.book_source) return NextResponse.json({ error: "Community not found." }, { status: 404 });

  try {
    const book = await getBookDetails(community.book_source, community.book_id);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    return NextResponse.json({ ...community, book });
  } catch (detailError) {
    console.error("Community book lookup failed:", detailError);
    return NextResponse.json({ error: "Could not load community book." }, { status: 502 });
  }
}
