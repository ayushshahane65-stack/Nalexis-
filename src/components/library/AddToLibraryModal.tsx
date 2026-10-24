"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  Check,
  Heart,
  Loader2,
  Lock,
  Plus,
  Star,
  X,
  Sparkles,
  FolderPlus,
} from "lucide-react";
import type { ApiBook } from "@/lib/books";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";
import {
  getLocalShelves,
  createLocalShelf,
  saveLocalLibraryBook,
  type LocalShelf,
} from "@/lib/local-library";

interface Shelf {
  id: string;
  name: string;
  is_public: boolean;
  is_default: boolean;
}

interface AddToLibraryModalProps {
  book: ApiBook;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialStatus?: LibraryBookStatus;
  initialShelfIds?: string[];
  initialRating?: number | null;
  initialReflection?: string | null;
  initialIsFavourite?: boolean;
}

const STATUS_OPTIONS: Array<{ value: LibraryBookStatus; label: string; desc: string }> = [
  { value: "want_to_read", label: "Want to Read", desc: "Queued for future discovery" },
  { value: "currently_reading", label: "Currently Reading", desc: "Actively reading right now" },
  { value: "finished", label: "Finished", desc: "Completed this book" },
  { value: "paused", label: "Paused", desc: "Temporarily put on hold" },
  { value: "dropped", label: "Dropped", desc: "Decided not to continue" },
];

export default function AddToLibraryModal({
  book,
  isOpen,
  onClose,
  onSuccess,
  initialStatus = "want_to_read",
  initialShelfIds = [],
  initialRating = null,
  initialReflection = null,
  initialIsFavourite = false,
}: AddToLibraryModalProps) {
  const [status, setStatus] = useState<LibraryBookStatus>(initialStatus);
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [reflection, setReflection] = useState(initialReflection ?? "");
  const [isReflectionShared, setIsReflectionShared] = useState(false);
  const [selectedShelves, setSelectedShelves] = useState<string[]>(initialShelfIds);
  const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New shelf inline creator
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");

  // Fetch available shelves on open
  useEffect(() => {
    if (!isOpen) return;
    setStatus(initialStatus);
    setIsFavourite(initialIsFavourite);
    setRating(initialRating);
    setReflection(initialReflection ?? "");
    setSelectedShelves(initialShelfIds);
    setError(null);
    setIsCreatingShelf(false);
    setNewShelfName("");

    // 1. Preload local shelves immediately
    const local = getLocalShelves();
    setAvailableShelves(local);

    // 2. Try fetching cloud shelves and merge
    fetch("/api/shelves")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Shelf[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const filteredCloud = data.filter((s) => !["imported-epubs", "downloaded"].includes(s.name.toLowerCase()));
          // Deduplicate with local by name
          const merged = [...filteredCloud];
          for (const loc of local) {
            if (!merged.some((m) => m.name.toLowerCase() === loc.name.toLowerCase())) {
              merged.push(loc);
            }
          }
          setAvailableShelves(merged);
        }
      })
      .catch(() => {
        // Local shelves are already loaded
      });
  }, [isOpen, initialStatus, initialShelfIds, initialRating, initialReflection, initialIsFavourite]);

  if (!isOpen) return null;

  const toggleShelf = (shelfId: string) => {
    setSelectedShelves((prev) =>
      prev.includes(shelfId) ? prev.filter((id) => id !== shelfId) : [...prev, shelfId]
    );
  };

  const handleCreateNewShelf = () => {
    if (!newShelfName.trim()) return;
    const created = createLocalShelf(newShelfName.trim());
    setAvailableShelves((prev) => [...prev, created]);
    setSelectedShelves((prev) => [...prev, created.id]);
    setNewShelfName("");
    setIsCreatingShelf(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    // 1. ALWAYS save to local resilient storage first
    saveLocalLibraryBook(book, status, {
      is_favourite: isFavourite,
      rating: status === "finished" ? rating : null,
      reflection: status === "finished" && reflection.trim() ? reflection.trim() : null,
      shelf_ids: selectedShelves,
    });

    // 2. Try syncing with backend API if available
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: book.source,
          book_id: String(book.id),
          status,
          is_favourite: isFavourite,
          rating: status === "finished" ? rating : null,
          reflection: status === "finished" && reflection.trim() ? reflection.trim() : null,
          is_reflection_shared: status === "finished" ? isReflectionShared : false,
          shelf_ids: selectedShelves,
        }),
      });
    } catch {
      // Backend may be offline, but local save succeeded!
    } finally {
      setIsSaving(false);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-all my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
              {book.cover ? (
                <Image src={book.cover} alt={book.title} fill unoptimized className="object-cover" />
              ) : (
                <BookOpen className="size-6 m-auto inset-0 absolute text-zinc-400" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                Manage in Library
              </p>
              <h2 className="font-serif text-lg font-bold leading-tight text-[var(--text)] line-clamp-1">
                {book.title}
              </h2>
              <p className="text-xs text-[var(--text-muted)] line-clamp-1">{book.author}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-zinc-100 hover:text-[var(--text)] dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* Reading Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Reading Status
            </label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text)] shadow-xs"
                        : "border-[var(--border)] hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 text-[var(--text-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-medium ${isSelected ? "text-[var(--primary)] font-semibold" : ""}`}>
                        {opt.label}
                      </span>
                      {isSelected && <Check className="size-3.5 text-[var(--primary)]" />}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Favourite Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-center gap-2.5">
              <Heart
                className={`size-4 transition-colors ${
                  isFavourite ? "fill-rose-500 text-rose-500" : "text-[var(--text-muted)]"
                }`}
              />
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Favourite</p>
                <p className="text-[10px] text-[var(--text-muted)]">Showcase among your treasured books</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFavourite(!isFavourite)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isFavourite ? "bg-[var(--primary)]" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                  isFavourite ? "translate-x-4.5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* If Finished: Rating & Reflection */}
          {status === "finished" && (
            <div className="rounded-xl border border-[var(--border)] bg-zinc-50/50 p-4 dark:bg-zinc-900/40 space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Personal Rating (Optional)</label>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      className="p-1 text-zinc-300 hover:text-amber-400 transition-colors"
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`size-5 ${
                          rating && rating >= star ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="ml-2 text-[10px] text-[var(--text-muted)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Reflection / Thoughts (Optional)</label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What thoughts or emotions did this book leave you with?"
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              {reflection.trim().length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isReflectionShared}
                    onChange={(e) => setIsReflectionShared(e.target.checked)}
                    className="size-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-xs text-[var(--text-muted)]">
                    Share this reflection on my public Profile Living Library
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Shelves Selection */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Add to Shelves
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingShelf(!isCreatingShelf)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:underline"
              >
                <Plus className="size-3" />
                <span>New Shelf</span>
              </button>
            </div>

            {/* Quick Shelf Creator Inline */}
            {isCreatingShelf && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/5 p-2">
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="e.g. Masterpieces, Philosophy..."
                  className="flex-1 bg-transparent px-2 text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateNewShelf();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateNewShelf}
                  disabled={!newShelfName.trim()}
                  className="rounded-lg bg-[var(--primary)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingShelf(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {availableShelves.map((shelf) => {
                const isChecked = selectedShelves.includes(shelf.id);
                return (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => toggleShelf(shelf.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors ${
                      isChecked
                        ? "border-[var(--primary)]/60 bg-[var(--primary)]/5 text-[var(--text)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-zinc-400 dark:border-zinc-600"
                        }`}
                      >
                        {isChecked && <Check className="size-3" />}
                      </div>
                      <span className="text-xs font-medium">{shelf.name}</span>
                    </div>
                    {!shelf.is_public && (
                      <span title="Private shelf" className="text-zinc-400">
                        <Lock className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity shadow-xs"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            <span>Save to Library</span>
          </button>
        </div>
      </div>
    </div>
  );
}
