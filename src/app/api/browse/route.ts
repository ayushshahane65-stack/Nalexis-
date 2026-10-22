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

  const academicQuery = category === "textbooks & academic" ? "textbooks academic" : category;
  const gutCategory = category === "textbooks & academic" ? "education" : category;

  const [gutResult, olResult, oapenResult, doabResult] = await Promise.allSettled([
    browseGutendex(gutCategory, page),
    browseOpenLibrary(category, page),
    browseOapen(academicQuery, page),
    browseDoab(academicQuery, page),
  ]);

  if (oapenResult.status === "rejected") console.warn("OAPEN browse failed:", oapenResult.reason);
  if (doabResult.status === "rejected") console.warn("DOAB browse failed:", doabResult.reason);
  if (gutResult.status === "rejected") console.warn("Gutendex browse failed:", gutResult.reason);
  if (olResult.status === "rejected") console.warn("OpenLibrary browse failed:", olResult.reason);

  const gutBooks: GutenbergBook[] =
    gutResult.status === "fulfilled" ? gutResult.value : [];
  const olBooks: OpenLibraryBook[] =
    olResult.status === "fulfilled" ? olResult.value : [];
  const oapenBooks: AcademicBook[] =
    oapenResult.status === "fulfilled" ? oapenResult.value : [];
  const doabBooks: AcademicBook[] =
    doabResult.status === "fulfilled" ? doabResult.value : [];

  const merged: BrowseBook[] = [...gutBooks, ...olBooks, ...oapenBooks, ...doabBooks];

  const seen = new Set<string>();
  const deduped = merged.filter((b) => {
    const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(deduped);
}
