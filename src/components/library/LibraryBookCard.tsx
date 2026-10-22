"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Heart,
  MoreVertical,
  Star,
  Trash2,
  ArrowRight,
  FolderPlus,
  StickyNote,
  Lock,
} from "lucide-react";
import type { ApiBook } from "@/lib/books";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";

interface LibraryBookCardProps {
  book: ApiBook;
  status: LibraryBookStatus;
  progress?: number;
  rating?: number | null;
  reflection?: string | null;
  isFavourite?: boolean;
  isUserEpub?: boolean;
  onStatusChange: (newStatus: LibraryBookStatus) => void;
  onToggleFavourite: () => void;
  onOpenManageModal: () => void;
  onOpenNotes: () => void;
  onRemove: () => void;
}

const STATUS_LABELS: Record<LibraryBookStatus, { label: string; bg: string; text: string }> = {
  currently_reading: {
    label: "Reading",
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  finished: {
    label: "Finished",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-800 dark:text-blue-300",
  },
  want_to_read: {
    label: "Want to read",
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-300",
  },
  paused: {
    label: "Paused",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
  },
  dropped: {
    label: "Dropped",
    bg: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-800 dark:text-rose-300",
  },
};

export default function LibraryBookCard({
  book,
  status,
  progress = 0,
  rating = null,
  reflection = null,
  isFavourite = false,
  isUserEpub = false,
  onStatusChange,
  onToggleFavourite,
  onOpenManageModal,
  onOpenNotes,
  onRemove,
}: LibraryBookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const readUrl = isUserEpub
    ? `/read/upload/${encodeURIComponent(String(book.id))}`
    : `/reader/${book.source}/${encodeURIComponent(String(book.id))}`;

  const detailUrl = isUserEpub
    ? `/read/upload/${encodeURIComponent(String(book.id))}`
    : `/book/${book.source}/${encodeURIComponent(String(book.id))}`;

  const statusBadge = STATUS_LABELS[status] || STATUS_LABELS.want_to_read;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs transition-all hover:shadow-md">
      {/* Book Cover Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Link href={detailUrl} className="block size-full">
          {book.cover ? (
            <Image
              src={book.cover}
              alt={book.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-102"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-4 text-center">
              <BookOpen className="size-10 text-zinc-400" />
            </div>
          )}
        </Link>

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {isUserEpub ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white shadow-xs">
                <Lock className="size-2.5" />
                <span>On Device</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-zinc-900/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white shadow-xs">
                {book.source}
              </span>
            )}
          </div>

          {/* Favourite button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavourite();
            }}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-xs text-white hover:bg-black/60 transition-colors"
            aria-label="Toggle favourite"
          >
            <Heart
              className={`size-3.5 transition-colors ${
                isFavourite ? "fill-rose-500 text-rose-500" : "text-white"
              }`}
            />
          </button>
        </div>

        {/* Reading progress overlay if reading */}
        {status === "currently_reading" && progress > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Info & Actions */}
      <div className="flex flex-1 flex-col p-3.5 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${statusBadge.bg} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>

            {/* Rating Stars for finished books */}
            {status === "finished" && rating && (
              <div className="flex items-center gap-0.5 text-amber-500" title={`${rating} of 5 stars`}>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-semibold text-[var(--text)]">{rating}</span>
              </div>
            )}
          </div>

          <Link href={detailUrl} className="mt-1.5 block">
            <h3 className="font-serif text-sm font-bold leading-snug text-[var(--text)] line-clamp-2 hover:text-[var(--primary)] transition-colors">
              {book.title}
            </h3>
          </Link>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-1">{book.author}</p>

          {/* Reflection preview if finished */}
          {status === "finished" && reflection && (
            <p className="mt-2 line-clamp-1 text-[11px] text-[var(--text-muted)] italic">
              &ldquo;{reflection}&rdquo;
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
          {/* Main Action Button */}
          {status === "currently_reading" ? (
            <Link
              href={readUrl}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] py-1.5 px-3 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <span>Continue</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              href={readUrl}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-1.5 px-3 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BookOpen className="size-3.5" />
              <span>Read</span>
            </Link>
          )}

          {/* Action Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-zinc-100 hover:text-[var(--text)] dark:hover:bg-zinc-800 transition-colors"
              aria-label="Options"
            >
              <MoreVertical className="size-3.5" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 bottom-full mb-1 z-40 w-44 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl text-xs space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenManageModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <FolderPlus className="size-3.5" />
                    <span>Manage Shelves</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenNotes();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <StickyNote className="size-3.5" />
                    <span>Notes & Quotes</span>
                  </button>

                  <div className="my-1 border-t border-[var(--border)]" />

                  {/* Status quick switch */}
                  {(["currently_reading", "finished", "want_to_read"] as LibraryBookStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onStatusChange(st);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-left text-[11px] ${
                        status === st
                          ? "font-semibold text-[var(--primary)] bg-[var(--primary)]/10"
                          : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>Mark {STATUS_LABELS[st].label}</span>
                      {status === st && <CheckCircle2 className="size-3" />}
                    </button>
                  ))}

                  <div className="my-1 border-t border-[var(--border)]" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Remove from Library</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
