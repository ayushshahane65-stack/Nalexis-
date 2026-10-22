"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Globe, Lock, Loader2, X, Sparkles } from "lucide-react";

interface ShelfData {
  id?: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  is_public: boolean;
}

interface CreateShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (shelf: ShelfData) => void;
  initialData?: ShelfData | null; // If editing
}

export default function CreateShelfModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CreateShelfModalProps) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false); // Default to PRIVATE as per privacy rules
  const [coverImage, setCoverImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description ?? "");
        setIsPublic(initialData.is_public ?? false);
        setCoverImage(initialData.cover_image ?? "");
      } else {
        setName("");
        setDescription("");
        setIsPublic(false);
        setCoverImage("");
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Shelf name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing ? `/api/shelves/${initialData!.id}` : "/api/shelves";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          is_public: isPublic,
          cover_image: coverImage.trim() ? coverImage.trim() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save shelf");
      }

      const savedShelf = await res.json();
      onSuccess(savedShelf);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-[var(--primary)] dark:bg-emerald-950/60">
              <FolderPlus className="size-4.5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[var(--text)]">
                {isEditing ? "Edit Custom Shelf" : "Create New Shelf"}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">Organize your books into personal thematic collections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">
              Shelf Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Comfort Reads, Books for 2026, Philosophy"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What unites this collection of books?"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Custom Cover Image URL (Optional)</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://... (leave empty for automatic book cover collage)"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="rounded-xl border border-[var(--border)] bg-zinc-50/50 p-3.5 dark:bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="size-4 text-zinc-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">
                    {isPublic ? "Public Shelf" : "Private Shelf"}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isPublic
                      ? "Visible on your public Living Library profile for visitors to discover."
                      : "Strictly private. Visible only to you when logged in."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  isPublic ? "bg-[var(--primary)]" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity shadow-xs"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Shelf"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
