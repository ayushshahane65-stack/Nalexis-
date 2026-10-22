import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookDetails } from "@/lib/book-details";
import type { BookSource } from "@/lib/books";

interface CommunityRow {
  id: string;
  book_id: string;
  book_source: BookSource | null;
  member_count: number;
  post_count: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .select("id, book_id, book_source, member_count, post_count")
    .order("member_count", { ascending: false });
  if (error) {
    console.error("Communities lookup failed:", error.message);
    return NextResponse.json({ error: "Could not load communities." }, { status: 500 });
  }

  const results = await Promise.allSettled((data as CommunityRow[] ?? []).filter((row) => row.book_source)
    .map(async (row) => {
      const book = await getBookDetails(row.book_source!, row.book_id);
      if (!book) return null;
      return { ...row, book };
    }));
  const communities = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  for (const result of results) if (result.status === "rejected") console.error("Community book lookup failed:", result.reason);
  if (results.length > 0 && results.every((result) => result.status === "rejected")) {
    return NextResponse.json({ error: "Book sources are unavailable." }, { status: 502 });
  }
  return NextResponse.json(communities);
}
