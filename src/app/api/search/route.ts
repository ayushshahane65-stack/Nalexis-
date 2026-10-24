import { NextResponse } from "next/server";
import { searchGutendex } from "@/lib/gutendex";
import { searchOpenLibrary } from "@/lib/openlibrary";
import { searchDoab, searchOapen } from "@/lib/academicbooks";
import type { GutenbergBook } from "@/lib/gutendex";
import type { OpenLibraryBook } from "@/lib/openlibrary";
import type { AcademicBook } from "@/lib/academicbooks";

export type SearchBook = GutenbergBook | OpenLibraryBook | AcademicBook;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Query parameter `q` is required." },
      { status: 400 }
    );
  }

  const query = q.trim();

  // Run all independent catalog searches concurrently
  const [gutResult, olResult, oapenResult, doabResult] = await Promise.allSettled([
    searchGutendex(query),
    searchOpenLibrary(query),
    searchOapen(query),
    searchDoab(query),
  ]);

  // Log provider failures clearly on the server
  if (gutResult.status === "rejected") {
    console.error(`[Search API] Gutenberg search failed for "${query}":`, gutResult.reason);
  }
  if (olResult.status === "rejected") {
    console.error(`[Search API] Open Library search failed for "${query}":`, olResult.reason);
  }
  if (oapenResult.status === "rejected") {
    console.error(`[Search API] OAPEN search failed for "${query}":`, oapenResult.reason);
  }
  if (doabResult.status === "rejected") {
    console.error(`[Search API] DOAB search failed for "${query}":`, doabResult.reason);
  }

  // If every single provider rejected with a network/critical failure
  const allRejected = [gutResult, olResult, oapenResult, doabResult].every(
    (res) => res.status === "rejected"
  );
  if (allRejected) {
    return NextResponse.json({ error: "All book sources are currently unavailable." }, { status: 502 });
  }

  const gutBooks: GutenbergBook[] =
    gutResult.status === "fulfilled" && Array.isArray(gutResult.value) ? gutResult.value : [];
  const olBooks: OpenLibraryBook[] =
    olResult.status === "fulfilled" && Array.isArray(olResult.value) ? olResult.value : [];
  const oapenBooks: AcademicBook[] =
    oapenResult.status === "fulfilled" && Array.isArray(oapenResult.value) ? oapenResult.value : [];
  const doabBooks: AcademicBook[] =
    doabResult.status === "fulfilled" && Array.isArray(doabResult.value) ? doabResult.value : [];

  // Interleave and merge results from all providers
  const merged: SearchBook[] = [...gutBooks, ...olBooks, ...oapenBooks, ...doabBooks];

  // Deduplicate exact same source items and exact duplicate editions,
  // without deleting differing editions/formats across providers
  const seenIds = new Set<string>();
  const deduped = merged.filter((b) => {
    const key = `${b.source}:${b.id}`;
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });

  return NextResponse.json(deduped, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
