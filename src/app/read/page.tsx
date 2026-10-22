"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ParsedEpub, ReaderProgress } from "@/lib/epub/types";
import { getAllUserBooksAsync, deleteUserBookAsync, getProgress } from "@/lib/epub/storage";
import AppShell from "@/components/app/AppShell";
import EpubUploader from "@/components/library/EpubUploader";
import RemoveBookModal from "@/components/library/RemoveBookModal";

export default function OnDevicePage() {
  const [userBooks, setUserBooks] = useState<ParsedEpub[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReaderProgress | null>>({});
  const [loading, setLoading] = useState(true);
  const [bookToDelete, setBookToDelete] = useState<ParsedEpub | null>(null);

  // Load on-device books from IndexedDB
  const loadBooks = useCallback(async () => {
    try {
      const books = await getAllUserBooksAsync();
      setUserBooks(books);
      const prog: Record<string, ReaderProgress | null> = {};
      for (const b of books) {
        prog[b.id] = getProgress(b.id);
      }
      setProgressMap(prog);
    } catch (err) {
      console.error("Failed loading local on-device books:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const handleBookUploaded = (newBook: ParsedEpub) => {
    setUserBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)]);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    try {
      await deleteUserBookAsync(bookToDelete.id);
      setUserBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id));
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[bookToDelete.id];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete book:", err);
    } finally {
      setBookToDelete(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
            On Device
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="size-3.5 text-[var(--primary)]" />
            <span>Your uploaded books stay on this device and are private to you.</span>
          </p>
        </div>

        {/* Upload Zone */}
        <div className="mt-8">
          <EpubUploader
            existingBooks={userBooks}
            onBookUploaded={handleBookUploaded}
          />
        </div>

        {/* Books Grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-serif text-xl font-semibold text-[var(--text)]">
              Your Books ({userBooks.length})
            </h2>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div aria-busy="true" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-56 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && userBooks.length === 0 && (
            <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mb-3">
                <Sparkles className="size-6" />
              </div>
              <p className="font-serif text-base font-semibold text-[var(--text)]">
                No books yet. Upload your first EPUB.
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                Upload any DRM-free EPUB up to 50 MB to start reading offline and privately.
              </p>
            </div>
          )}

          {/* Books grid */}
          {!loading && userBooks.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {userBooks.map((book) => {
                const progress = progressMap[book.id];
                const percent =
                  progress?.percentage !== undefined
                    ? Math.round(progress.percentage)
                    : progress?.scrollPercent !== undefined
                    ? Math.round(progress.scrollPercent)
                    : 0;

                return (
                  <div
                    key={book.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/40"
                  >
                    {/* Cover */}
                    <div className="relative flex h-52 w-full items-center justify-center bg-[var(--background)] overflow-hidden">
                      {book.metadata.coverUrl ? (
                        <Image
                          src={book.metadata.coverUrl}
                          alt={book.metadata.title}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-amber-50 to-stone-200 dark:from-stone-900 dark:to-zinc-950">
                          <BookOpen className="size-8 text-[var(--primary)]/70 mb-2" />
                          <span className="font-serif text-xs font-bold line-clamp-3 text-[var(--text)] leading-tight">
                            {book.metadata.title}
                          </span>
                          <span className="mt-1 text-[10px] text-[var(--text-muted)] line-clamp-1">
                            {book.metadata.creator}
                          </span>
                        </div>
                      )}

                      {percent > 0 && (
                        <div className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                          {percent}% read
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {percent > 0 && (
                      <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-1 bg-[var(--primary)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 font-serif text-sm font-semibold text-[var(--text)] leading-snug">
                        {book.metadata.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                        {book.metadata.creator || "Unknown Author"}
                      </p>

                      <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] text-[11px]">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {formatFileSize(book.fileSize)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setBookToDelete(book);
                            }}
                            title="Remove book"
                            className="inline-flex size-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>

                          <Link
                            href={`/read/upload/${encodeURIComponent(book.id)}`}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-colors shadow-xs"
                          >
                            <span>{percent > 0 ? "Continue" : "Read"}</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Remove Book Confirmation Modal */}
        <RemoveBookModal
          isOpen={bookToDelete !== null}
          bookTitle={bookToDelete?.metadata.title || "this book"}
          onCancel={() => setBookToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </main>
    </AppShell>
  );
}
