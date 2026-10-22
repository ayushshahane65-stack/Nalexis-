"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Globe, Lock, ShieldAlert } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import type { ApiBook } from "@/lib/books";

interface PageProps {
  params: Promise<{ username: string; shelfId: string }>;
}

interface ShelfData {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_public: boolean;
  books: Array<{ source: string; book_id: string; order_index: number }>;
}

export default function PublicShelfPage({ params }: PageProps) {
  const { username, shelfId } = use(params);
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [resolvedBooks, setResolvedBooks] = useState<ApiBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsPrivate(false);
    setNotFound(false);

    fetch(`/api/public/u/${encodeURIComponent(username)}/shelves/${encodeURIComponent(shelfId)}`)
      .then(async (res) => {
        if (res.status === 403) {
          setIsPrivate(true);
          return null;
        }
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json() as Promise<ShelfData>;
      })
      .then(async (data) => {
        if (!data) return;
        setShelf(data);

        // Resolve book metadata
        const books = await Promise.all(
          (data.books ?? []).map(async (b) => {
            try {
              const bRes = await fetch(`/api/books/${b.source}/${encodeURIComponent(b.book_id)}`);
              if (bRes.ok) return (await bRes.json()) as ApiBook;
            } catch {
              // ignore
            }
            return {
              id: b.book_id,
              source: b.source as any,
              title: `Book ${b.book_id}`,
              author: "Unknown Author",
              description: "",
              cover: null,
              readUrl: null,
              access: "public" as const,
            };
          })
        );
        setResolvedBooks(books);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [username, shelfId]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-16 animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-72 rounded bg-zinc-200 dark:bg-zinc-800" />
        </main>
      </AppShell>
    );
  }

  if (isPrivate) {
    return (
      <AppShell>
        <main className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
            <Lock className="size-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text)]">This Shelf is Private</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            The owner of this shelf has marked it as private. Only the shelf owner can view its contents.
          </p>
          <div className="pt-2">
            <Link
              href={`/u/${encodeURIComponent(username)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white shadow-xs"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to @{username}&apos;s Living Library</span>
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  if (notFound || !shelf) {
    return (
      <AppShell>
        <main className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <BookOpen className="size-10 mx-auto text-zinc-400" />
          <h1 className="font-serif text-2xl font-bold text-[var(--text)]">Shelf Not Found</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            This bookshelf does not exist or may have been deleted.
          </p>
          <div className="pt-2">
            <Link
              href={`/u/${encodeURIComponent(username)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white shadow-xs"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to @{username}&apos;s Profile</span>
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        <Link
          href={`/u/${encodeURIComponent(username)}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--primary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to @{username}&apos;s Living Library</span>
        </Link>

        {/* Shelf Header */}
        <div className="border-b border-[var(--border)] pb-6 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
            <Globe className="size-3" />
            <span>Public Shelf • @{username}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--text)]">{shelf.name}</h1>
          {shelf.description && (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              {shelf.description}
            </p>
          )}
          <p className="text-xs text-[var(--text-muted)] pt-1">
            {resolvedBooks.length} {resolvedBooks.length === 1 ? "book" : "books"} on this shelf
          </p>
        </div>

        {/* Books Grid */}
        {resolvedBooks.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No books have been added to this shelf yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {resolvedBooks.map((book) => (
              <Link
                key={`${book.source}:${book.id}`}
                href={`/book/${book.source}/${encodeURIComponent(String(book.id))}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs hover:shadow-md transition-all"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {book.cover ? (
                    <Image
                      src={book.cover}
                      alt={book.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <BookOpen className="size-8 text-zinc-400" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-serif text-xs font-bold leading-snug text-[var(--text)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{book.author}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
