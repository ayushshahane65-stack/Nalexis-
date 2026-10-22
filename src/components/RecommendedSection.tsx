"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Bookmark, ArrowRight, RefreshCw, AlertCircle, Check } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AddToLibraryButton from "@/components/library/AddToLibraryButton";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      <div className="h-64 w-full rounded-[var(--radius-card)] bg-[var(--card)] animate-pulse border border-[var(--border)]" />
      <div className="mt-2 h-4 w-3/4 rounded bg-[var(--border)] animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-[var(--border)] animate-pulse" />
    </div>
  );
}

export default function RecommendedSection() {
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const fetchBooks = useCallback(() => {
    setStatus("loading");
    fetch("/api/popular?page=1")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load recommendations");
        return res.json() as Promise<ApiBook[]>;
      })
      .then((data) => {
        // Take first 5 or 6 books for the curated recommended shelf
        setBooks(Array.isArray(data) ? data.slice(0, 5) : []);
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    fetchBooks();

    // Check bookmarks in localStorage
    try {
      const raw = localStorage.getItem("nalexis_reader_bookmarks");
      if (raw) {
        const marks = JSON.parse(raw) as Array<{ bookId: string }>;
        setBookmarkedIds(new Set(marks.map((m) => m.bookId)));
      }
    } catch {
      // ignore
    }
  }, [fetchBooks]);

  const toggleBookmark = (e: React.MouseEvent, book: ApiBook) => {
    e.preventDefault();
    e.stopPropagation();

    const bookKey = `${book.source}:${book.id}`;
    const nextSet = new Set(bookmarkedIds);
    const isMarked = nextSet.has(bookKey);

    if (isMarked) {
      nextSet.delete(bookKey);
    } else {
      nextSet.add(bookKey);
    }
    setBookmarkedIds(nextSet);

    // Save to local storage
    try {
      const raw = localStorage.getItem("nalexis_reader_bookmarks");
      const list = raw ? JSON.parse(raw) : [];
      const updated = isMarked
        ? list.filter((b: { bookId: string }) => b.bookId !== bookKey)
        : [
            {
              id: `bm-${Date.now()}`,
              bookId: bookKey,
              bookTitle: book.title,
              bookAuthor: book.author,
              savedAt: new Date().toISOString(),
            },
            ...list,
          ];
      localStorage.setItem("nalexis_reader_bookmarks", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <section
      id="handpicked-stories"
      aria-labelledby="recommended-heading"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
    >
      {/* Section Header: Eyebrow + Serif Heading + View all -> */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
            Handpicked stories
          </p>
          <h2
            id="recommended-heading"
            className="mt-1 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
          >
            Recommended for you
          </h2>
        </div>

        <Link
          href="/discover"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:underline"
        >
          <span>View all</span>
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Content states */}
      <div className="mt-8">
        {status === "loading" && (
          <div
            aria-busy="true"
            aria-label="Loading recommended books"
            className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center"
          >
            <AlertCircle className="size-8 text-[var(--text-muted)]" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-[var(--text)]">Could not load recommendations right now.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Check your network connection and try again.</p>
            <button
              type="button"
              onClick={fetchBooks}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--card)] active:scale-[0.98]"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {status === "success" && books.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
            <BookOpen className="size-8 text-[var(--text-muted)]" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-[var(--text)]">No recommendations available</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Browse our full catalog in Explore.</p>
          </div>
        )}

        {status === "success" && books.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => {
              const bookKey = `${book.source}:${book.id}`;
              const isBookmarked = bookmarkedIds.has(bookKey);
              const detailHref = `/book/${book.source}/${encodeURIComponent(String(book.id))}`;
              const sourceLabel =
                book.source === "gutenberg"
                  ? "Gutenberg"
                  : book.source === "openlibrary"
                  ? "Open Library"
                  : book.source.toUpperCase();

              return (
                <article
                  key={`${book.source}-${book.id}`}
                  className="group flex flex-col gap-2.5 transition-transform duration-200"
                >
                  <Link
                    href={detailHref}
                    className="relative block h-64 w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card-subtle)] shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    {/* Cover image */}
                    {book.cover ? (
                      <Image
                        src={book.cover}
                        alt={book.title}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-102"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--card-subtle)] text-[var(--text-muted)]">
                        <BookOpen className="size-10 opacity-30" aria-hidden="true" />
                      </div>
                    )}

                    {/* Book spine shadow overlay on left edge */}
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-black/15 pointer-events-none" />

                    {/* Source Tag Badge on top left */}
                    <div className="absolute left-2.5 top-2.5">
                      <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                        {sourceLabel}
                      </span>
                    </div>

                    {/* Add to Library / Shelf Button on top right */}
                    <div className="absolute right-2.5 top-2.5 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <AddToLibraryButton book={book} variant="icon" />
                    </div>
                  </Link>

                  {/* Book Metadata below cover */}
                  <Link href={detailHref} className="flex flex-col gap-0.5">
                    <h3 className="line-clamp-2 font-serif text-sm font-normal leading-snug text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                      {book.title}
                    </h3>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {book.author}
                    </p>
                    <span className="mt-0.5 text-[10px] font-medium text-[var(--primary)] dark:text-[var(--eyebrow)]">
                      {book.access === "borrowable"
                        ? "Borrowable"
                        : book.access === "no_ebook"
                        ? "Details only"
                        : "Free access"}
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Thin divider line between sections */}
      <hr className="mt-14 border-t border-[var(--border)]" />
    </section>
  );
}
