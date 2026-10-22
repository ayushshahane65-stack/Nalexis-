import { NextResponse } from "next/server";
import { getAcademicBook } from "@/lib/academicbooks";
import type { AcademicSource } from "@/lib/academicbooks";

interface RouteContext {
  params: Promise<{ source: string; id: string[] }>;
}

const SOURCES: AcademicSource[] = ["oapen", "doab"];

export async function GET(request: Request, { params }: RouteContext) {
  const { source, id: idParts } = await params;
  const id = idParts.join("/");
  if (!SOURCES.includes(source as AcademicSource)) {
    return NextResponse.json({ error: "Invalid PDF source." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Book ID is required." }, { status: 400 });

  try {
    const book = await getAcademicBook(source as AcademicSource, id);
    if (!book || book.external || book.format !== "pdf") {
      return NextResponse.json({ error: "No PDF is available for this book." }, { status: 404 });
    }

    const pdfUrl = new URL(book.readUrl);
    if (pdfUrl.protocol !== "https:" || pdfUrl.hostname !== "library.oapen.org") {
      return NextResponse.json({ error: "The PDF host is not supported." }, { status: 502 });
    }

    const range = request.headers.get("range");
    const headers = new Headers({
      "User-Agent": "Nalexis/1.0 (book reader)",
      Accept: "application/pdf",
    });
    if (range) headers.set("Range", range);

    const upstream = await fetch(pdfUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
      ...(range ? {} : { next: { revalidate: 86400 } }),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: `The PDF source returned HTTP ${upstream.status}.` }, { status: 502 });
    }
    if (!upstream.body) {
      return NextResponse.json({ error: "The PDF source returned an empty file." }, { status: 502 });
    }

    const responseHeaders = new Headers({
      "Content-Type": upstream.headers.get("content-type")?.includes("pdf")
        ? upstream.headers.get("content-type")!
        : "application/pdf",
      "Content-Disposition": "inline",
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    });
    for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(`Could not stream PDF for ${source}/${id}:`, error);
    const message = error instanceof Error ? error.message : "Could not load the PDF.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
