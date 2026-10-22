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

  const [gutResult, olResult, oapenResult, doabResult] = await Promise.allSettled([
    searchGutendex(q),
    searchOpenLibrary(q),
    searchOapen(q),
    searchDoab(q),
  ]);

  if (oapenResult.status === "rejected") console.error("OAPEN search failed:", oapenResult.reason);
  if (doabResult.status === "rejected") console.error("DOAB search failed:", doabResult.reason);
  if ([gutResult, olResult, oapenResult, doabResult].every((result) => result.status === "rejected")) {
    return NextResponse.json({ error: "All book sources are unavailable." }, { status: 502 });
  }

  const gutBooks: GutenbergBook[] =
    gutResult.status === "fulfilled" ? gutResult.value : [];
  const olBooks: OpenLibraryBook[] =
    olResult.status === "fulfilled" ? olResult.value : [];
  const oapenBooks: AcademicBook[] =
    oapenResult.status === "fulfilled" ? oapenResult.value : [];
  const doabBooks: AcademicBook[] =
    doabResult.status === "fulfilled" ? doabResult.value : [];

  const merged: SearchBook[] = [...gutBooks, ...olBooks, ...oapenBooks, ...doabBooks];

  const seen = new Set<string>();
  const deduped = merged.filter((b) => {
    const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(deduped);
}
