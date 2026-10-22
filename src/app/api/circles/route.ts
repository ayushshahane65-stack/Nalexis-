import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookDetails } from "@/lib/book-details";
import type { BookSource } from "@/lib/books";

interface CircleRow {
  id: string;
  name: string;
  description: string | null;
  book_id: string;
  book_source: BookSource | null;
  member_count: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_circles")
    .select("id,name,description,book_id,book_source,member_count")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .returns<CircleRow[]>();
  if (error) {
    console.error("Reading circles lookup failed:", error.message);
    return NextResponse.json({ error: "Could not load reading circles." }, { status: 500 });
  }

  const results = await Promise.allSettled((data as CircleRow[] ?? []).filter((circle) => circle.book_source)
    .map(async (circle) => {
      const book = await getBookDetails(circle.book_source!, circle.book_id);
      return book ? { ...circle, book } : null;
    }));
  const circles = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  for (const result of results) if (result.status === "rejected") console.error("Circle book lookup failed:", result.reason);
  if (results.length > 0 && results.every((result) => result.status === "rejected")) {
    return NextResponse.json({ error: "Book sources are unavailable." }, { status: 502 });
  }
  return NextResponse.json(circles);
}
