"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { getUserBookByIdAsync } from "@/lib/epub/storage";
import type { ParsedEpub } from "@/lib/epub/types";
import WebReader from "@/components/reader/WebReader";

interface UploadReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function UploadReaderPage({ params }: UploadReaderPageProps) {
  const { id } = use(params);
  const bookId = decodeURIComponent(id);

  const [book, setBook] = useState<ParsedEpub | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setErrorMsg("");
    try {
      const loaded = await getUserBookByIdAsync(bookId);
      if (!loaded) {
        setErrorMsg("Book not found. It may have been removed from this device.");
        setState("error");
        return;
      }
      if (!loaded.chapters || loaded.chapters.length === 0) {
        setErrorMsg("This book has no readable chapters. Try re-uploading it.");
        setState("error");
        return;
      }
      setBook(loaded);
      setState("success");

      // Log started_book milestone
      void fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "started_book",
          source: "user",
          book_id: bookId,
          metadata: { title: loaded.metadata.title },
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to load book:", err);
      setErrorMsg("Could not load this book. Please try again.");
      setState("error");
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Loading state
  if (state === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)]">
        <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-muted)]">Loading your book…</p>
      </main>
    );
  }

  // Error state with retry
  if (state === "error" || !book) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-4">
        <p className="text-sm text-[var(--text-muted)] text-center max-w-md">
          {errorMsg || "Something went wrong."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-xs"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
          <Link
            href="/read"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)]"
          >
            <ArrowLeft className="size-4" /> Back to On Device
          </Link>
        </div>
      </main>
    );
  }

  // Render existing WebReader with all features (themes, highlights, definitions, vocabulary, etc.)
  return <WebReader book={book} />;
}
