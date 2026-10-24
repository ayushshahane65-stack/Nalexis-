"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Moon, RefreshCw, Sun } from "lucide-react";
import type { ApiBook } from "@/lib/books";

interface ReaderPageProps {
  params: Promise<{ source: string; id: string[] }>;
}

interface ReadResponse {
  format: "html" | "embed" | "pdf";
  content?: string;
  url?: string;
  originalUrl: string;
  book?: ApiBook;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { source, id: idParts } = use(params);
  const id = idParts.join("/");
  const [book, setBook] = useState<ApiBook | null>(null);
  const [reading, setReading] = useState<ReadResponse | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const load = useCallback(async () => {
    setErrorMessage(null);

    // 1. Check if background prefetch has already buffered this book (0ms load!)
    const cacheKey = `nalexis_prefetched_read_${source}_${id}`;
    let bufferedContent: ReadResponse | null = null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        bufferedContent = JSON.parse(raw) as ReadResponse;
      }
    } catch {}

    if (bufferedContent) {
      setReading(bufferedContent);
      if (bufferedContent.book) {
        setBook(bufferedContent.book);
      }
      setState("success");

      // Auto update library status in background
      void fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, book_id: id, status: "currently_reading" }),
      }).catch(() => {});
      return;
    }

    setState("loading");

    try {
      const readResponse = await fetch(`/api/read/${source}/${encodeURIComponent(id)}`);
      if (!readResponse.ok) {
        const errorData = await readResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || "This book has no readable online file.");
      }

      const content: ReadResponse = await readResponse.json();
      setReading(content);

      if (content.book) {
        setBook(content.book);
      } else {
        const bookResponse = await fetch(`/api/books/${source}/${encodeURIComponent(id)}`);
        if (bookResponse.ok) {
          setBook(await bookResponse.json());
        }
      }

      setState("success");

      // Automatically move to Currently Reading and log started_book event
      void fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          book_id: id,
          status: "currently_reading",
        }),
      }).catch(() => {});
    } catch (error: unknown) {
      console.error("Could not open book reader:", error);
      const msg = error instanceof Error ? error.message : "We couldn't open this book right now. Check your connection and try again.";
      setErrorMessage(msg);
      setState("error");
    }
  }, [source, id]);

  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <main className="min-h-screen animate-pulse bg-zinc-100 dark:bg-zinc-950" aria-label="Loading book" />;

  if (state === "error" || !book || !reading) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
      <div className="space-y-1.5 max-w-md">
        <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">Could Not Open Book</h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          {errorMessage || "We couldn't open this book right now. Check your connection and try again."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={() => { void load(); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-800">
          <RefreshCw className="size-3.5" /> Retry
        </button>
        <Link href={`/book/${source}/${encodeURIComponent(id)}`} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="size-3.5" /> Book Details
        </Link>
      </div>
    </main>
  );

  return <main className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={`/book/${source}/${encodeURIComponent(String(book.id))}`} className="inline-flex items-center gap-2 text-sm text-emerald-700"><ArrowLeft className="size-4" /> Back</Link>
      <h1 className="min-w-0 flex-1 truncate font-serif text-sm font-semibold">{book.title}</h1>
      {reading.format === "html" && <>
        <label className="flex items-center gap-2 text-xs" htmlFor="reader-font-size">Text</label>
        <input id="reader-font-size" type="range" min="14" max="24" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} aria-label="Reader text size" />
        <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-md border p-2" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </>}
      <a href={reading.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium">
        Open original in new tab <ExternalLink className="size-3.5" />
      </a>
    </header>
    {reading.format === "html" && <div className={`min-h-0 flex-1 overflow-y-auto ${theme === "dark" ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"}`}>
      <article className="reader-content mx-auto w-full max-w-[700px] px-6 py-10" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: reading.content ?? "" }} />
    </div>}
    {reading.format === "embed" && <iframe title={book.title} src={reading.url} className="min-h-0 w-full flex-1 border-0" allow="fullscreen" />}
    {reading.format === "pdf" && <iframe title={book.title} src={reading.url} className="min-h-0 w-full flex-1 border-0" />}
  </main>;
}
