import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookDetails } from "@/lib/book-details";
import type { BookSource } from "@/lib/books";

interface RouteContext { params: Promise<{ id: string }> }
interface CircleRow {
  id: string;
  name: string;
  description: string | null;
  book_id: string;
  book_source: string | null;
  member_count: number;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_circles")
    .select("id,name,description,book_id,book_source,member_count")
    .eq("id", id)
    .returns<CircleRow>()
    .single();
  const circle = data as unknown as CircleRow | null;
  if (error || !circle?.book_source) return NextResponse.json({ error: "Reading circle not found." }, { status: 404 });

  try {
    const book = await getBookDetails(circle.book_source as BookSource, circle.book_id);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    return NextResponse.json({ ...circle, book });
  } catch (detailError) {
    console.error("Circle book lookup failed:", detailError);
    return NextResponse.json({ error: "Could not load circle book." }, { status: 502 });
  }
}
