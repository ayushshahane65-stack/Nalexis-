"use client";

import { Trash2, AlertTriangle } from "lucide-react";

interface RemoveBookModalProps {
  bookTitle: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RemoveBookModal({
  bookTitle,
  isOpen,
  onConfirm,
  onCancel,
}: RemoveBookModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-book-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl transition-all">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
            <AlertTriangle className="size-5" />
          </div>
          <h2 id="remove-book-modal-title" className="font-serif text-lg font-semibold text-[var(--text)]">
            Remove book
          </h2>
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Are you sure you want to remove <span className="font-semibold text-[var(--text)]">&ldquo;{bookTitle}&rdquo;</span>? This will permanently delete the file and all your saved reading progress from this device.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors shadow-xs"
          >
            <Trash2 className="size-3.5" />
            <span>Remove book</span>
          </button>
        </div>
      </div>
    </div>
  );
}
