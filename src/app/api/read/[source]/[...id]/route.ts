import { NextResponse } from "next/server";
import { getBookDetails } from "@/lib/book-details";
import { fetchGutenbergHtml } from "@/lib/read-content";
import type { BookSource } from "@/lib/books";

interface RouteContext {
  params: Promise<{ source: string; id: string[] }>;
}

const SOURCES: BookSource[] = ["gutenberg", "openlibrary", "oapen", "doab"];

export async function GET(_request: Request, { params }: RouteContext) {
  const { source, id: idParts } = await params;
  const id = idParts.join("/");
  if (!SOURCES.includes(source as BookSource)) {
    return NextResponse.json({ error: "Invalid book source." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Book ID is required." }, { status: 400 });

  try {
    const book = await getBookDetails(source as BookSource, id);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

    const cacheHeaders = {
      "Cache-Control": "public, max-age=7200, stale-while-revalidate=86400",
    };

    if (book.source === "gutenberg" && book.readUrl) {
      const content = await fetchGutenbergHtml(book.readUrl);
      return NextResponse.json(
        { format: "html", content, originalUrl: book.readUrl, book },
        { headers: cacheHeaders }
      );
    }

    if (book.source === "openlibrary" && book.readUrl) {
      try {
        const iaId = new URL(book.readUrl).pathname.split("/").filter(Boolean).at(-1);
        if (iaId) {
          return NextResponse.json(
            {
              format: "embed",
              url: `https://archive.org/embed/${encodeURIComponent(iaId)}`,
              originalUrl: book.readUrl,
              book,
            },
            { headers: cacheHeaders }
          );
        }
      } catch {
        // Fall through
      }
    }

    if ((book.source === "oapen" || book.source === "doab") &&
      book.format === "pdf" && !book.external && book.readUrl) {
      return NextResponse.json(
        {
          format: "pdf",
          url: `/api/pdf/${book.source}/${encodeURIComponent(String(book.id))}`,
          originalUrl: book.readUrl,
          book,
        },
        { headers: cacheHeaders }
      );
    }

    return NextResponse.json({ error: "This book has no readable online file." }, { status: 404 });
  } catch (error) {
    console.error(`Could not prepare reader for ${source}/${id}:`, error);
    const message = error instanceof Error ? error.message : "Could not load book content.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
