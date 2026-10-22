"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import type { ApiBook } from "@/lib/books";

interface ActiveReadingData {
  bookId: string;
  source: string;
  title: string;
  author: string;
  cover?: string | null;
  description?: string;
  chapterIndex?: number;
  totalChapters?: number;
  scrollPercent: number;
}

export default function ContinueReadingSection() {
  const [activeReading, setActiveReading] = useState<ActiveReadingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check real reading-progress data from localStorage and library
    try {
      const rawProgress = localStorage.getItem("nalexis_reader_progress");
      if (rawProgress) {
        const parsed = JSON.parse(rawProgress) as Record<
          string,
          {
            bookId: string;
            chapterIndex: number;
            scrollPercent: number;
            lastReadAt: string;
          }
        >;
        const entries = Object.values(parsed);
        if (entries.length > 0) {
          // Sort by lastReadAt descending
          entries.sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());
          const latest = entries[0];

          // Check if there is cached metadata for this book
          const rawUserBooks = localStorage.getItem("nalexis_user_epub_books");
          let bookMeta: { title?: string; author?: string; coverUrl?: string; chapters?: unknown[] } | null = null;
          if (rawUserBooks) {
            try {
              const books = JSON.parse(rawUserBooks);
              bookMeta = books.find((b: { id: string }) => b.id === latest.bookId);
            } catch {
              // ignore
            }
          }

          if (bookMeta) {
            setActiveReading({
              bookId: latest.bookId,
              source: "user",
              title: bookMeta.title || "Current Reading",
              author: bookMeta.author || "Unknown Author",
              cover: bookMeta.coverUrl || null,
              chapterIndex: latest.chapterIndex,
              totalChapters: bookMeta.chapters?.length || 1,
              scrollPercent: Math.round(latest.scrollPercent || 0),
            });
            setLoading(false);
            return;
          }

          // If not in user books, check if it's a catalog book (e.g. source/id)
          const parts = latest.bookId.split(":");
          const source = parts.length > 1 ? parts[0] : "gutenberg";
          const id = parts.length > 1 ? parts[1] : latest.bookId;

          fetch(`/api/books/${source}/${encodeURIComponent(id)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((book: ApiBook | null) => {
              if (book) {
                setActiveReading({
                  bookId: id,
                  source: book.source,
                  title: book.title,
                  author: book.author,
                  cover: book.cover,
                  description: book.description,
                  chapterIndex: latest.chapterIndex,
                  scrollPercent: Math.round(latest.scrollPercent || 0),
                });
              }
            })
            .catch(() => {
              // Ignore failure
            })
            .finally(() => {
              setLoading(false);
            });
          return;
        }
      }
    } catch {
      // Storage unavailable or empty
    }

    // Also check server-side shelf entries if user is authenticated
    fetch("/api/library")
      .then((res) => (res.ok ? res.json() : []))
      .then(async (entries: Array<{ book_id: string; source?: string; book_source?: string; status: string; progress?: number; current_page?: number }>) => {
        const reading = entries.find((e) => e.status === "currently_reading" || e.status === "reading");
        const source = reading?.source || reading?.book_source;
        if (reading && source) {
          const detailRes = await fetch(`/api/books/${source}/${encodeURIComponent(reading.book_id)}`);
          if (detailRes.ok) {
            const b = (await detailRes.json()) as ApiBook;
            setActiveReading({
              bookId: reading.book_id,
              source: source,
              title: b.title,
              author: b.author,
              cover: b.cover,
              description: b.description,
              scrollPercent: reading.progress ?? (reading.current_page ? Math.min(100, Math.round(reading.current_page)) : 10),
            });
          }
        }
      })
      .catch(() => {
        // Ignore errors
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // STRICT RULE: If the user has no real reading progress, hide that section instead of showing fake data
  if (loading || !activeReading) {
    return null;
  }

  const readUrl =
    activeReading.source === "user"
      ? `/read/upload/${encodeURIComponent(activeReading.bookId)}`
      : `/reader/${activeReading.source}/${encodeURIComponent(activeReading.bookId)}`;

  const detailUrl =
    activeReading.source === "user"
      ? `/read/upload/${encodeURIComponent(activeReading.bookId)}`
      : `/book/${activeReading.source}/${encodeURIComponent(activeReading.bookId)}`;

  const chapterText =
    activeReading.chapterIndex !== undefined && activeReading.totalChapters
      ? `Chapter ${activeReading.chapterIndex + 1} of ${activeReading.totalChapters} · `
      : activeReading.chapterIndex !== undefined
      ? `Chapter ${activeReading.chapterIndex + 1} · `
      : "";

  return (
    <section
      aria-labelledby="continue-reading-heading"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left column: Progress tracker */}
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
            Pick up where you left off
          </p>

          <h2
            id="continue-reading-heading"
            className="mt-2 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
          >
            Continue reading
          </h2>

          <p className="mt-2 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">{activeReading.title}</span> · {activeReading.author}
          </p>

          {/* Thin green progress bar */}
          <div className="mt-5 w-full max-w-lg">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
              role="progressbar"
              aria-valuenow={activeReading.scrollPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Reading progress: ${activeReading.scrollPercent}%`}
            >
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, activeReading.scrollPercent))}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-[var(--text-muted)] tabular-nums">
              {chapterText}{activeReading.scrollPercent}% complete
            </p>
          </div>

          {/* Action button: Deep forest green button with book icon */}
          <div className="mt-6">
            <Link
              href={readUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-xs transition-all duration-150 hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              <span>Continue reading</span>
            </Link>
          </div>
        </div>

        {/* Right column: "On your nightstand" book card */}
        <div className="lg:col-span-5">
          <div className="flex overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs transition-shadow duration-200 hover:shadow-md">
            {/* Book Cover */}
            <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md bg-[var(--card-subtle)] shadow-xs">
              {activeReading.cover ? (
                <Image
                  src={activeReading.cover}
                  alt={activeReading.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                  <BookOpen className="size-8 opacity-40" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="ml-4 flex flex-1 flex-col justify-between py-1">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">On your nightstand</p>
                <h3 className="mt-1 line-clamp-2 font-serif text-lg font-normal leading-snug text-[var(--text)]">
                  {activeReading.title}
                </h3>
                {activeReading.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    {activeReading.description}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">by {activeReading.author}</p>
                )}
              </div>

              <div className="mt-3">
                <Link
                  href={detailUrl}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] transition-colors hover:underline"
                >
                  <span>View book</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thin divider line between sections */}
      <hr className="mt-12 border-t border-[var(--border)]" />
    </section>
  );
}
