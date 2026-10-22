"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Plus, Loader2 } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AddToLibraryModal from "./AddToLibraryModal";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";

interface AddToLibraryButtonProps {
  book: ApiBook;
  variant?: "primary" | "secondary" | "icon";
  className?: string;
}

export default function AddToLibraryButton({
  book,
  variant = "secondary",
  className = "",
}: AddToLibraryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LibraryBookStatus>("want_to_read");
  const [shelfIds, setShelfIds] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Check if book is already in library
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/library`)
      .then((res) => (res.ok ? res.json() : []))
      .then((books: Array<{ source: string; book_id: string; status: LibraryBookStatus; shelf_ids: string[] }>) => {
        if (!isMounted) return;
        const found = books.find(
          (b) => b.source === book.source && String(b.book_id) === String(book.id)
        );
        if (found) {
          setIsInLibrary(true);
          setCurrentStatus(found.status);
          setShelfIds(found.shelf_ids ?? []);
        } else {
          setIsInLibrary(false);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [book.source, book.id]);

  const buttonContent = (
    <>
      {isInLibrary ? (
        <>
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>In Library</span>
        </>
      ) : (
        <>
          <Plus className="size-3.5" />
          <span>Add to Library</span>
        </>
      )}
    </>
  );

  let variantClasses = "";
  if (variant === "primary") {
    variantClasses = "bg-[var(--primary)] text-white hover:opacity-90";
  } else if (variant === "icon") {
    variantClasses = "flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs hover:bg-black/60";
  } else {
    variantClasses = "border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800";
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all shadow-xs ${variantClasses} ${className}`}
      >
        {variant === "icon" ? (
          <Bookmark className={`size-3.5 ${isInLibrary ? "fill-white" : ""}`} />
        ) : (
          buttonContent
        )}
      </button>

      {isOpen && (
        <AddToLibraryModal
          book={book}
          isOpen={true}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            setIsInLibrary(true);
          }}
          initialStatus={currentStatus}
          initialShelfIds={shelfIds}
        />
      )}
    </>
  );
}
