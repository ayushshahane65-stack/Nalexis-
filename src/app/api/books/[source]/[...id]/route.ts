import { NextResponse } from "next/server";
import { getBookDetails } from "@/lib/book-details";
import type { BookSource } from "@/lib/books";

interface RouteContext {
  params: Promise<{ source: string; id: string[] }>;
}

const SOURCES: BookSource[] = ["gutenberg", "openlibrary", "oapen", "doab"];

export async function GET(_request: Request, { params }: RouteContext) {
  const { source, id: pathId } = await params;
  const id = pathId.join("/");

  if (!SOURCES.includes(source as BookSource)) {
    return NextResponse.json({ error: "Invalid book source." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Book ID is required." }, { status: 400 });

  try {
    const book = await getBookDetails(source as BookSource, id);
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    return NextResponse.json(book);
  } catch (error) {
    console.error(`Book detail lookup failed (${source}/${id}):`, error);
    return NextResponse.json({ error: "Could not load book details." }, { status: 502 });
  }
}
