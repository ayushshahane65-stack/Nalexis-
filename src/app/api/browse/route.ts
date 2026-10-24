import { NextResponse } from "next/server";
import { browseGutendex } from "@/lib/gutendex";
import { browseOpenLibrary } from "@/lib/openlibrary";
import { browseDoab, browseOapen } from "@/lib/academicbooks";
import type { GutenbergBook } from "@/lib/gutendex";
import type { OpenLibraryBook } from "@/lib/openlibrary";
import type { AcademicBook } from "@/lib/academicbooks";

export type BrowseBook = GutenbergBook | OpenLibraryBook | AcademicBook;

// Valid categories the UI can request
const VALID_CATEGORIES = new Set([
  "popular", "classics", "romance", "adventure",
  "crime", "science fiction", "poetry", "philosophy", "drama",
  "textbooks & academic",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "popular").toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const academicQuery = category === "textbooks & academic" ? "academic textbooks" : category;
  const gutCategory = category === "textbooks & academic" ? "education" : category;

  const [gutResult, olResult, oapenResult, doabResult] = await Promise.allSettled([
    browseGutendex(gutCategory, page),
    browseOpenLibrary(category, page),
    browseOapen(academicQuery, page),
    browseDoab(academicQuery, page),
  ]);

  if (oapenResult.status === "rejected") {
    console.warn(`[Browse API] OAPEN browse failed for "${category}":`, oapenResult.reason);
  }
  if (doabResult.status === "rejected") {
    console.warn(`[Browse API] DOAB browse failed for "${category}":`, doabResult.reason);
  }
  if (gutResult.status === "rejected") {
    console.warn(`[Browse API] Gutendex browse failed for "${category}":`, gutResult.reason);
  }
  if (olResult.status === "rejected") {
    console.warn(`[Browse API] OpenLibrary browse failed for "${category}":`, olResult.reason);
  }

  const gutBooks: GutenbergBook[] =
    gutResult.status === "fulfilled" && Array.isArray(gutResult.value) ? gutResult.value : [];
  const olBooks: OpenLibraryBook[] =
    olResult.status === "fulfilled" && Array.isArray(olResult.value) ? olResult.value : [];
  const oapenBooks: AcademicBook[] =
    oapenResult.status === "fulfilled" && Array.isArray(oapenResult.value) ? oapenResult.value : [];
  const doabBooks: AcademicBook[] =
    doabResult.status === "fulfilled" && Array.isArray(doabResult.value) ? doabResult.value : [];

  const merged: BrowseBook[] = [...gutBooks, ...olBooks, ...oapenBooks, ...doabBooks];

  // Deduplicate exact same source items without deleting distinct editions
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
