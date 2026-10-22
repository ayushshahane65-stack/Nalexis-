"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteShelfModalProps {
  shelfName: string;
  shelfId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteShelfModal({
  shelfName,
  shelfId,
  isOpen,
  onClose,
  onSuccess,
}: DeleteShelfModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/shelves/${shelfId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete shelf");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting shelf");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[var(--text)]">Delete Shelf</h3>
            <p className="text-xs text-[var(--text-muted)]">This action cannot be undone.</p>
          </div>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
          Are you sure you want to delete the shelf <strong className="text-[var(--text)]">&ldquo;{shelfName}&rdquo;</strong>?
        </p>
        <p className="mt-2 text-xs text-zinc-500 italic">
          Note: This will <strong>not</strong> delete any books from your library. Only this custom shelf collection will be removed.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 shadow-xs transition-colors"
          >
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            <span>Delete Shelf</span>
          </button>
        </div>
      </div>
    </div>
  );
}
