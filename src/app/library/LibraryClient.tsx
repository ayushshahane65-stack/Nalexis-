"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Compass,
  Edit2,
  FileUp,
  Folder,
  FolderPlus,
  Globe,
  Heart,
  Lock,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { ApiBook, BookSource } from "@/lib/books";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";
import AppShell from "@/components/app/AppShell";
import LibraryBookCard from "@/components/library/LibraryBookCard";
import AddToLibraryModal from "@/components/library/AddToLibraryModal";
import BookNotesSlideover from "@/components/library/BookNotesSlideover";
import RemoveBookModal from "@/components/library/RemoveBookModal";
import CreateShelfModal from "@/components/library/CreateShelfModal";
import DeleteShelfModal from "@/components/library/DeleteShelfModal";
import ShelfCollage from "@/components/library/ShelfCollage";
import EpubUploader from "@/components/library/EpubUploader";
import { getAllUserBooksAsync, deleteUserBookAsync } from "@/lib/epub/storage";
import type { ParsedEpub } from "@/lib/epub/types";

interface LibraryBookEntry {
  id: string;
  source: BookSource | "user";
  book_id: string;
  status: LibraryBookStatus;
  progress: number;
  rating: number | null;
  reflection: string | null;
  is_reflection_shared: boolean;
  is_favourite: boolean;
  shelf_ids: string[];
  updated_at: string;
  book?: ApiBook;
}

interface ShelfItem {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  slug: string | null;
  is_default: boolean;
  is_public: boolean;
  book_count: number;
}

type TabKey =
  | "all"
  | "currently-reading"
  | "finished"
  | "want-to-read"
  | "favourites"
  | "imported-epubs"
  | "paused-dropped"
  | "downloaded"
  | string; // shelfId

export default function LibraryClient() {
  const [entries, setEntries] = useState<LibraryBookEntry[]>([]);
  const [shelves, setShelves] = useState<ShelfItem[]>([]);
  const [onDeviceBooks, setOnDeviceBooks] = useState<ParsedEpub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "progress">("updated");
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Modals & Panels
  const [selectedBookForManage, setSelectedBookForManage] = useState<LibraryBookEntry | null>(null);
  const [selectedBookForNotes, setSelectedBookForNotes] = useState<LibraryBookEntry | null>(null);
  const [bookToRemove, setBookToRemove] = useState<{ title: string; source: string; id: string; isEpub: boolean } | null>(null);
  const [showUploaderModal, setShowUploaderModal] = useState(false);
  const [showCreateShelfModal, setShowCreateShelfModal] = useState(false);
  const [shelfToEdit, setShelfToEdit] = useState<ShelfItem | null>(null);
  const [shelfToDelete, setShelfToDelete] = useState<ShelfItem | null>(null);

  // Load Library Books & Shelves
  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setIsUnauthenticated(false);

    // 1. ALWAYS load local on-device EPUBs from IndexedDB FIRST
    // This guarantees your uploaded EPUBs & reading features are always available
    try {
      const epubs = await getAllUserBooksAsync();
      setOnDeviceBooks(epubs);
    } catch (localErr) {
      console.warn("Could not load local on-device EPUBs:", localErr);
    }

    try {
      // 2. Fetch cloud library books
      const libraryRes = await fetch("/api/library");

      if (libraryRes.status === 401) {
        // User is browsing in guest mode (not signed in)
        setIsUnauthenticated(true);
        setEntries([]);
        setShelves([]);
        return;
      }

      if (!libraryRes.ok) {
        console.warn("Cloud library API returned status:", libraryRes.status);
        setHasError(true);
        return;
      }

      const libraryEntries: LibraryBookEntry[] = await libraryRes.json();

      // 3. Fetch cloud shelves
      const shelvesRes = await fetch("/api/shelves");
      const shelvesData: ShelfItem[] = shelvesRes.ok ? await shelvesRes.json() : [];
      setShelves(shelvesData);

      // 4. Resolve book metadata for API books in parallel
      const enriched = await Promise.all(
        libraryEntries.map(async (entry) => {
          try {
            const detailRes = await fetch(`/api/books/${entry.source}/${encodeURIComponent(entry.book_id)}`);
            if (detailRes.ok) {
              const bookData: ApiBook = await detailRes.json();
              return { ...entry, book: bookData };
            }
          } catch {
            // fallback minimal book
          }
          return {
            ...entry,
            book: {
              id: entry.book_id,
              source: entry.source,
              title: `Book ${entry.book_id}`,
              author: "Unknown Author",
              description: "",
              cover: null,
              readUrl: null,
              access: "public",
            } as ApiBook,
          };
        })
      );

      setEntries(enriched);
    } catch (err) {
      console.warn("Cloud library sync failed:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  // Convert on-device books to unified view entries
  const onDeviceEntries: LibraryBookEntry[] = useMemo(() => {
    return onDeviceBooks.map((epub) => ({
      id: epub.id,
      source: "user" as BookSource,
      book_id: epub.id,
      status: "currently_reading" as LibraryBookStatus,
      progress: 0,
      rating: null,
      reflection: null,
      is_reflection_shared: false,
      is_favourite: false,
      shelf_ids: ["imported-epubs"],
      updated_at: epub.addedAt,
      book: {
        id: epub.id,
        source: "user" as BookSource,
        title: epub.metadata.title,
        author: epub.metadata.creator || "Unknown Author",
        description: epub.metadata.description || "",
        cover: epub.metadata.coverUrl || null,
        readUrl: `/read/upload/${encodeURIComponent(epub.id)}`,
        access: "free",
      },
    }));
  }, [onDeviceBooks]);

  // Active Custom Shelf (if currently viewing one)
  const activeCustomShelf = useMemo(() => {
    return shelves.find((s) => s.id === activeTab && !s.is_default);
  }, [shelves, activeTab]);

  // Filter & Search Logic
  const filteredBooks = useMemo(() => {
    let list: LibraryBookEntry[] = [];

    if (activeTab === "all") {
      list = [...entries, ...onDeviceEntries];
    } else if (activeTab === "currently-reading") {
      list = entries.filter((e) => e.status === "currently_reading");
    } else if (activeTab === "finished") {
      list = entries.filter((e) => e.status === "finished");
    } else if (activeTab === "want-to-read") {
      list = entries.filter((e) => e.status === "want_to_read");
    } else if (activeTab === "favourites") {
      list = entries.filter((e) => e.is_favourite);
    } else if (activeTab === "imported-epubs") {
      list = onDeviceEntries;
    } else if (activeTab === "paused-dropped") {
      list = entries.filter((e) => e.status === "paused" || e.status === "dropped");
    } else if (activeTab === "downloaded") {
      list = [];
    } else {
      // Custom shelf selected by ID
      list = entries.filter((e) => e.shelf_ids.includes(activeTab));
    }

    // Apply secondary status filter if set
    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => {
        const title = e.book?.title.toLowerCase() ?? "";
        const author = e.book?.author.toLowerCase() ?? "";
        return title.includes(q) || author.includes(q);
      });
    }

    // Apply sorting (disabled when in manual reorder mode on custom shelves)
    if (!isReorderMode || !activeCustomShelf) {
      list.sort((a, b) => {
        if (sortBy === "title") {
          return (a.book?.title ?? "").localeCompare(b.book?.title ?? "");
        }
        if (sortBy === "progress") {
          return (b.progress ?? 0) - (a.progress ?? 0);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    }

    return list;
  }, [entries, onDeviceEntries, activeTab, statusFilter, searchQuery, sortBy, isReorderMode, activeCustomShelf]);

  // Quick Status Change
  const handleStatusChange = async (entry: LibraryBookEntry, newStatus: LibraryBookStatus) => {
    if (entry.source === "user") return;
    try {
      await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: entry.source,
          book_id: entry.book_id,
          status: newStatus,
        }),
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.source === entry.source && e.book_id === entry.book_id ? { ...e, status: newStatus } : e
        )
      );
    } catch (err) {
      console.error("Status change error:", err);
    }
  };

  // Toggle Favourite
  const handleToggleFavourite = async (entry: LibraryBookEntry) => {
    if (entry.source === "user") return;
    const nextFav = !entry.is_favourite;
    try {
      await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: entry.source,
          book_id: entry.book_id,
          is_favourite: nextFav,
        }),
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.source === entry.source && e.book_id === entry.book_id ? { ...e, is_favourite: nextFav } : e
        )
      );
    } catch (err) {
      console.error("Toggle favourite error:", err);
    }
  };

  // Toggle Shelf Privacy (Public / Private)
  const toggleShelfPrivacy = async (shelf: ShelfItem) => {
    const nextPublic = !shelf.is_public;
    try {
      const res = await fetch(`/api/shelves/${shelf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: nextPublic }),
      });
      if (res.ok) {
        setShelves((prev) =>
          prev.map((s) => (s.id === shelf.id ? { ...s, is_public: nextPublic } : s))
        );
      }
    } catch (err) {
      console.error("Privacy toggle error:", err);
    }
  };

  // Move book within shelf (Reordering)
  const moveBookInShelf = async (index: number, direction: "up" | "down") => {
    if (!activeCustomShelf) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredBooks.length) return;

    const reordered = [...filteredBooks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Save to backend
    const ordered_books = reordered.map((b) => ({ source: b.source, book_id: b.book_id }));
    try {
      await fetch(`/api/shelves/${activeCustomShelf.id}/books`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_books }),
      });
    } catch (err) {
      console.error("Reorder save error:", err);
    }
  };

  // Remove Book Handler
  const confirmRemoveBook = async () => {
    if (!bookToRemove) return;

    if (bookToRemove.isEpub) {
      await deleteUserBookAsync(bookToRemove.id);
      setOnDeviceBooks((prev) => prev.filter((b) => b.id !== bookToRemove.id));
    } else {
      await fetch(`/api/library?source=${encodeURIComponent(bookToRemove.source)}&bookId=${encodeURIComponent(bookToRemove.id)}`, {
        method: "DELETE",
      });
      setEntries((prev) =>
        prev.filter((e) => !(e.source === bookToRemove.source && e.book_id === bookToRemove.id))
      );
    }

    setBookToRemove(null);
  };

  const currentReadingCount = entries.filter((e) => e.status === "currently_reading").length;
  const finishedCount = entries.filter((e) => e.status === "finished").length;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              Private Management
            </p>
            <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text)]">
              My Library
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-muted)]">
              {entries.length + onDeviceBooks.length} books in your private collection
              {currentReadingCount > 0 && ` • ${currentReadingCount} currently reading`}
              {finishedCount > 0 && ` • ${finishedCount} completed`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setShelfToEdit(null);
                setShowCreateShelfModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <FolderPlus className="size-3.5 text-[var(--primary)]" />
              <span>New Shelf</span>
            </button>

            <button
              onClick={() => setShowUploaderModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <FileUp className="size-3.5 text-[var(--primary)]" />
              <span>Import EPUB</span>
            </button>

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-95 transition-opacity shadow-xs"
            >
              <Globe className="size-3.5" />
              <span>Preview Living Library</span>
            </Link>
          </div>
        </div>

        {/* Guest Mode Banner */}
        {isUnauthenticated && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Lock className="size-3.5 text-[var(--primary)]" />
                <span>Guest Mode • Local On-Device Library</span>
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed max-w-2xl">
                Your uploaded EPUBs and offline books are stored securely right here on this device and are 100% readable. Sign in to sync your cloud library, create custom shelves, and save personal reading reflections across devices.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 shadow-xs"
              >
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        )}

        {/* Search & Control Strip */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your library by title or author..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="currently_reading">Currently Reading</option>
              <option value="finished">Finished</option>
              <option value="want_to_read">Want to Read</option>
              <option value="paused">Paused</option>
              <option value="dropped">Dropped</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "updated" | "title" | "progress")}
              disabled={isReorderMode}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            >
              <option value="updated">Recently Updated</option>
              <option value="title">Title (A-Z)</option>
              <option value="progress">Reading Progress</option>
            </select>
          </div>
        </div>

        {/* Shelves Horizontal Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border)]">
          <button
            onClick={() => {
              setActiveTab("all");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            All Books ({entries.length + onDeviceBooks.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("currently-reading");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "currently-reading"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Currently Reading ({currentReadingCount})
          </button>

          <button
            onClick={() => {
              setActiveTab("finished");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "finished"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Finished Books ({finishedCount})
          </button>

          <button
            onClick={() => {
              setActiveTab("want-to-read");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "want-to-read"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Wishlist / Want to Read ({entries.filter((e) => e.status === "want_to_read").length})
          </button>

          <button
            onClick={() => {
              setActiveTab("favourites");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "favourites"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Favourites ({entries.filter((e) => e.is_favourite).length})
          </button>

          <button
            onClick={() => {
              setActiveTab("imported-epubs");
              setIsReorderMode(false);
            }}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "imported-epubs"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Lock className="size-3" />
            <span>Imported EPUBs ({onDeviceBooks.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("paused-dropped");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "paused-dropped"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Paused / Dropped ({entries.filter((e) => e.status === "paused" || e.status === "dropped").length})
          </button>

          <button
            onClick={() => {
              setActiveTab("downloaded");
              setIsReorderMode(false);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "downloaded"
                ? "bg-[var(--primary)] text-white shadow-xs"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Downloaded Books
          </button>

          {/* Custom Shelves */}
          {shelves
            .filter((s) => !s.is_default)
            .map((shelf) => (
              <button
                key={shelf.id}
                onClick={() => {
                  setActiveTab(shelf.id);
                  setIsReorderMode(false);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                  activeTab === shelf.id
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <Folder className="size-3" />
                <span>{shelf.name}</span>
                {!shelf.is_public && <Lock className="size-2.5 opacity-70" />}
              </button>
            ))}

          {/* New Shelf Quick Trigger */}
          <button
            onClick={() => {
              setShelfToEdit(null);
              setShowCreateShelfModal(true);
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-dashed border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            <Plus className="size-3" />
            <span>New Shelf</span>
          </button>
        </div>

        {/* Custom Shelf Spotlight Banner (when viewing a custom shelf) */}
        {activeCustomShelf && (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-zinc-50/70 dark:bg-zinc-900/40 p-5 sm:p-6 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <ShelfCollage
                  customCover={activeCustomShelf.cover_image}
                  bookCovers={filteredBooks.map((b) => b.book?.cover ?? null)}
                  size="md"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--primary)]">
                      Custom Shelf
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleShelfPrivacy(activeCustomShelf)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        activeCustomShelf.is_public
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                      title={activeCustomShelf.is_public ? "Click to make private" : "Click to make public"}
                    >
                      {activeCustomShelf.is_public ? (
                        <>
                          <Globe className="size-2.5" />
                          <span>Public Shelf</span>
                        </>
                      ) : (
                        <>
                          <Lock className="size-2.5" />
                          <span>Private Shelf</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h2 className="font-serif text-2xl font-bold text-[var(--text)]">{activeCustomShelf.name}</h2>
                  {activeCustomShelf.description && (
                    <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
                      {activeCustomShelf.description}
                    </p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] pt-0.5">
                    {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"} organized here
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReorderMode(!isReorderMode)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isReorderMode
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span>{isReorderMode ? "Done Reordering" : "Reorder Books"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShelfToEdit(activeCustomShelf);
                    setShowCreateShelfModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit Shelf</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShelfToDelete(activeCustomShelf)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-950/60 dark:bg-red-950/30 dark:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {isReorderMode && (
              <div className="mt-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-2.5 text-xs text-[var(--primary)] font-medium flex items-center justify-between">
                <span>Reorder Mode Active: Use the arrows on cards below to adjust the display order of your books.</span>
                <button onClick={() => setIsReorderMode(false)} className="underline text-[11px]">
                  Finish
                </button>
              </div>
            )}
          </div>
        )}

        {/* Embedded Uploader for Imported EPUBs Tab */}
        {activeTab === "imported-epubs" && (
          <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/60 dark:bg-zinc-900/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-[var(--text)] flex items-center gap-2">
                  <Lock className="size-4 text-[var(--primary)]" />
                  <span>On-Device EPUB Shelf</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Your files remain exclusively in local browser storage (IndexedDB). They are never sent to the server or shared publicly.
                </p>
              </div>
            </div>
            <EpubUploader
              existingBooks={onDeviceBooks}
              onBookUploaded={(newBook) => {
                setOnDeviceBooks((prev) => [newBook, ...prev]);
              }}
            />
          </div>
        )}

        {/* Downloaded Books Placeholder Shelf */}
        {activeTab === "downloaded" && (
          <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/60 dark:bg-zinc-900/30 p-12 text-center">
            <BookOpen className="size-10 mx-auto text-zinc-400 mb-3" />
            <h3 className="font-serif text-lg font-bold text-[var(--text)]">Downloaded Books</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
              Coming soon, for legal downloadable books and offline cache bundles.
            </p>
          </div>
        )}

        {/* Main Books Grid / Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col gap-2">
                <div className="aspect-[3/4] w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : hasError && filteredBooks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">Could not sync with cloud library.</p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Please check your connection or sign in. If you imported local EPUBs, click on the Imported EPUBs tab to read them.
            </p>
            <button
              onClick={() => void loadLibrary()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium"
            >
              <RefreshCw className="size-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[var(--primary)]">
              <BookOpen className="size-7" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[var(--text)]">
                {searchQuery
                  ? "No books match your search."
                  : activeTab === "all"
                  ? "Your library is waiting."
                  : "No books in this shelf yet."}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1">
                {searchQuery
                  ? "Try checking your spelling or clearing filters."
                  : activeTab === "all"
                  ? "Add a book from Discover to begin your reflective reading journey, or import your personal EPUBs."
                  : "Add books to this shelf using 'Manage Shelves' on any book card or book details page."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white shadow-xs hover:opacity-90 transition-opacity"
              >
                <Compass className="size-3.5" />
                <span>Explore Books</span>
              </Link>
              <button
                onClick={() => setShowUploaderModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FileUp className="size-3.5" />
                <span>Import EPUB</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBooks.map((entry, index) => {
              if (!entry.book) return null;
              return (
                <div key={`${entry.source}:${entry.book_id}`} className="relative">
                  {/* Reorder Arrows when in Reorder Mode */}
                  {isReorderMode && activeCustomShelf && (
                    <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 rounded-lg bg-black/70 backdrop-blur-xs p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => moveBookInShelf(index, "up")}
                        disabled={index === 0}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBookInShelf(index, "down")}
                        disabled={index === filteredBooks.length - 1}
                        className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  )}

                  <LibraryBookCard
                    book={entry.book}
                    status={entry.status}
                    progress={entry.progress}
                    rating={entry.rating}
                    reflection={entry.reflection}
                    isFavourite={entry.is_favourite}
                    isUserEpub={entry.source === "user"}
                    onStatusChange={(newStatus) => handleStatusChange(entry, newStatus)}
                    onToggleFavourite={() => handleToggleFavourite(entry)}
                    onOpenManageModal={() => setSelectedBookForManage(entry)}
                    onOpenNotes={() => setSelectedBookForNotes(entry)}
                    onRemove={() =>
                      setBookToRemove({
                        title: entry.book!.title,
                        source: entry.source,
                        id: entry.book_id,
                        isEpub: entry.source === "user",
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Manage Book Modal */}
        {selectedBookForManage && selectedBookForManage.book && (
          <AddToLibraryModal
            book={selectedBookForManage.book}
            isOpen={true}
            onClose={() => setSelectedBookForManage(null)}
            onSuccess={() => void loadLibrary()}
            initialStatus={selectedBookForManage.status}
            initialShelfIds={selectedBookForManage.shelf_ids}
            initialRating={selectedBookForManage.rating}
            initialReflection={selectedBookForManage.reflection}
            initialIsFavourite={selectedBookForManage.is_favourite}
          />
        )}

        {/* Notes & Reflections Slideover */}
        {selectedBookForNotes && selectedBookForNotes.book && (
          <BookNotesSlideover
            book={selectedBookForNotes.book}
            isOpen={true}
            onClose={() => setSelectedBookForNotes(null)}
            readUrl={
              selectedBookForNotes.source === "user"
                ? `/read/upload/${encodeURIComponent(selectedBookForNotes.book_id)}`
                : `/reader/${selectedBookForNotes.source}/${encodeURIComponent(selectedBookForNotes.book_id)}`
            }
          />
        )}

        {/* Create / Edit Shelf Modal */}
        {showCreateShelfModal && (
          <CreateShelfModal
            isOpen={true}
            initialData={shelfToEdit}
            onClose={() => {
              setShowCreateShelfModal(false);
              setShelfToEdit(null);
            }}
            onSuccess={(saved) => {
              void loadLibrary();
              if (saved.id) setActiveTab(saved.id);
            }}
          />
        )}

        {/* Delete Shelf Modal */}
        {shelfToDelete && (
          <DeleteShelfModal
            shelfId={shelfToDelete.id}
            shelfName={shelfToDelete.name}
            isOpen={true}
            onClose={() => setShelfToDelete(null)}
            onSuccess={() => {
              setActiveTab("all");
              void loadLibrary();
            }}
          />
        )}

        {/* Remove Book Modal */}
        {bookToRemove && (
          <RemoveBookModal
            bookTitle={bookToRemove.title}
            isOpen={true}
            onConfirm={confirmRemoveBook}
            onCancel={() => setBookToRemove(null)}
          />
        )}

        {/* Quick Upload Modal */}
        {showUploaderModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <FileUp className="size-4 text-[var(--primary)]" />
                  <h3 className="font-serif text-lg font-bold text-[var(--text)]">Import EPUB to Library</h3>
                </div>
                <button
                  onClick={() => setShowUploaderModal(false)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              <EpubUploader
                existingBooks={onDeviceBooks}
                onBookUploaded={(newBook) => {
                  setOnDeviceBooks((prev) => [newBook, ...prev]);
                  setShowUploaderModal(false);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
