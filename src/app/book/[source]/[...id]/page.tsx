"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ExternalLink,
  Globe,
  Heart,
  Library,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import type { ApiBook } from "@/lib/books";
import { isReadableBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";
import AddToLibraryModal from "@/components/library/AddToLibraryModal";
import type { LibraryBookStatus } from "@/lib/supabase/database.types";

interface PageProps {
  params: Promise<{ source: string; id: string[] }>;
}

function detailPath(source: string, id: string) {
  return `/api/books/${source}/${encodeURIComponent(id)}`;
}

const SOURCE_LABELS: Record<string, { name: string; badgeClass: string }> = {
  gutenberg: {
    name: "Project Gutenberg",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  openlibrary: {
    name: "Open Library",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  oapen: {
    name: "OAPEN Library",
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  doab: {
    name: "DOAB Academic",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
};

const STATUS_LABELS: Record<LibraryBookStatus, string> = {
  want_to_read: "Want to Read",
  currently_reading: "Currently Reading",
  finished: "Finished",
  paused: "Paused",
  dropped: "Dropped",
};

export default function BookPage({ params }: PageProps) {
  const { source, id: idParts } = use(params);
  const id = idParts.join("/");
  const router = useRouter();

  const [book, setBook] = useState<ApiBook | null>(null);
  const [related, setRelated] = useState<ApiBook[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "not_found">("loading");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // User Library & Favourite State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [currentLibraryStatus, setCurrentLibraryStatus] = useState<LibraryBookStatus>("want_to_read");
  const [isFavourite, setIsFavourite] = useState(false);
  const [shelfIds, setShelfIds] = useState<string[]>([]);
  const [isFavLoading, setIsFavLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Fetch Book Details and Related Books
  const load = useCallback(() => {
    setStatus("loading");
    setAuthError(null);

    return fetch(detailPath(source, id))
      .then(async (response) => {
        if (response.status === 404) {
          setStatus("not_found");
          return null;
        }
        if (!response.ok) {
          throw new Error("Could not load book details");
        }
        return response.json() as Promise<ApiBook>;
      })
      .then((result) => {
        if (!result) return;
        setBook(result);
        setStatus("success");

        // Load related books using first subject or author
        const queryTerm = result.subjects?.[0] || (result.author && result.author !== "Unknown" ? result.author : "");
        if (queryTerm) {
          fetch(`/api/search?q=${encodeURIComponent(queryTerm)}`)
            .then((res) => (res.ok ? (res.json() as Promise<ApiBook[]>) : []))
            .then((items) => {
              const filtered = items
                .filter((item) => !(item.source === source && String(item.id) === id))
                .slice(0, 8);
              setRelated(filtered);
            })
            .catch(() => setRelated([]));
        }
      })
      .catch((err) => {
        console.error("Book detail fetch error:", err);
        setStatus("error");
      });
  }, [source, id]);

  // 2. Fetch User Library Status for this Book
  const checkLibraryState = useCallback(() => {
    // 1. Check local storage first
    let foundLocally = false;
    try {
      // Import dynamically or read local library
      const raw = localStorage.getItem("nalexis_local_library_books");
      if (raw) {
        const localBooks = JSON.parse(raw) as Array<{
          source: string;
          book_id: string;
          status: LibraryBookStatus;
          is_favourite?: boolean;
          shelf_ids?: string[];
        }>;
        const found = localBooks.find(
          (b) => b.source === source && String(b.book_id) === String(id)
        );
        if (found) {
          foundLocally = true;
          setIsInLibrary(true);
          setCurrentLibraryStatus(found.status);
          setIsFavourite(Boolean(found.is_favourite));
          setShelfIds(found.shelf_ids ?? []);
        }
      }
    } catch {}

    // 2. Also check cloud API
    fetch("/api/library")
      .then((res) => (res.ok ? res.json() : []))
      .then((books: Array<{ source: string; book_id: string; status: LibraryBookStatus; is_favourite?: boolean; shelf_ids?: string[] }>) => {
        const found = books.find(
          (b) => b.source === source && String(b.book_id) === String(id)
        );
        if (found) {
          setIsInLibrary(true);
          setCurrentLibraryStatus(found.status);
          setIsFavourite(Boolean(found.is_favourite));
          setShelfIds(found.shelf_ids ?? []);
        } else if (!foundLocally) {
          setIsInLibrary(false);
          setIsFavourite(false);
          setShelfIds([]);
        }
      })
      .catch(() => {});
  }, [source, id]);

  useEffect(() => {
    void load();
    checkLibraryState();
  }, [load, checkLibraryState]);

  // 3. Background Pre-fetch to eliminate buffer time when clicking "Start Reading"
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    if (!book || !isReadableBook(book)) return;
    const cacheKey = `nalexis_prefetched_read_${source}_${id}`;

    try {
      if (sessionStorage.getItem(cacheKey)) {
        setIsPreloaded(true);
        return;
      }
    } catch {}

    // Silently pre-fetch reader content in the background while user reads synopsis
    fetch(`/api/read/${source}/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {}
          setIsPreloaded(true);
        }
      })
      .catch(() => {});
  }, [book, source, id]);

  // Handle Favourite Toggle
  const toggleFavourite = async () => {
    if (!book) return;
    setIsFavLoading(true);
    setAuthError(null);
    const newFavState = !isFavourite;

    // Immediately update UI and local storage
    setIsFavourite(newFavState);
    setIsInLibrary(true);
    try {
      const raw = localStorage.getItem("nalexis_local_library_books");
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((b: any) => b.source === book.source && String(b.book_id) === String(book.id));
      if (idx >= 0) {
        list[idx].is_favourite = newFavState;
        list[idx].updated_at = new Date().toISOString();
      } else {
        list.unshift({
          source: book.source,
          book_id: String(book.id),
          status: currentLibraryStatus || "want_to_read",
          progress: 0,
          is_favourite: newFavState,
          shelf_ids: shelfIds,
          title: book.title,
          author: book.author,
          cover: book.cover,
          updated_at: new Date().toISOString(),
        });
      }
      localStorage.setItem("nalexis_local_library_books", JSON.stringify(list));
    } catch {}

    try {
      if (isInLibrary) {
        await fetch("/api/library", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: book.source,
            book_id: String(book.id),
            is_favourite: newFavState,
          }),
        });
      } else {
        await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: book.source,
            book_id: String(book.id),
            status: "want_to_read",
            is_favourite: newFavState,
          }),
        });
      }
    } catch {
      // Local copy is already saved!
    } finally {
      setIsFavLoading(false);
    }
  };

  // Handle Share Link
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book?.title ?? "Book on Nalexis",
          text: `Check out "${book?.title}" by ${book?.author} on Nalexis`,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // Ignore clipboard write failure
    }
  };

  // ── Loading Skeleton ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-8 grid gap-8 sm:grid-cols-[240px_1fr]">
            <div className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-1/3 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex gap-3 pt-4">
                <div className="h-10 w-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-36 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="space-y-2 pt-6">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  // ── Error or 404 State ────────────────────────────────────────────────────────
  if (status === "error" || status === "not_found" || !book) {
    return (
      <AppShell>
        <main className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <BookOpen className="size-8 text-zinc-400" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {status === "not_found" ? "Book Not Found" : "Could Not Load Book"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {status === "not_found"
              ? "We couldn't locate this book in our catalogs. The ID may be incorrect or the provider removed it."
              : "An error occurred while contacting the book catalog. Please check your connection and try again."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {status === "error" && (
              <button
                onClick={() => {
                  void load();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
              >
                <RefreshCw className="size-3.5" /> Retry
              </button>
            )}
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Browse Books
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  // ── Render Details ────────────────────────────────────────────────────────────
  const readerPath = `/read/${source}/${encodeURIComponent(String(book.id))}`;
  const canRead = isReadableBook(book);

  // Access Badge Computation
  let accessBadge = {
    label: "Free to read",
    classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  };
  if (book.external) {
    accessBadge = {
      label: "External Provider",
      classes: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    };
  } else if (book.access === "borrowable") {
    accessBadge = {
      label: "Borrow on IA",
      classes: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  } else if (book.access === "no_ebook" || !canRead) {
    accessBadge = {
      label: "Info only",
      classes: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    };
  }

  const sourceConfig = SOURCE_LABELS[book.source] ?? {
    name: book.source.toUpperCase(),
    badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-200",
  };

  const descriptionText = book.description?.trim() || "";
  const isLongDesc = descriptionText.length > 340;
  const displayDesc = isLongDesc && !isDescExpanded ? `${descriptionText.slice(0, 340)}...` : descriptionText;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to Discover
          </Link>

          <span className="text-[11px] text-zinc-500 font-mono">
            {book.source}:{book.id}
          </span>
        </div>

        {/* Auth Error Notification */}
        {authError && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
            <span>{authError}</span>
            <Link href="/login" className="font-semibold underline hover:text-amber-900">
              Sign In
            </Link>
          </div>
        )}

        {/* Book Main Header Card */}
        <article className="mt-6 grid gap-8 sm:grid-cols-[240px_1fr] items-start">
          {/* Cover Display */}
          <div className="relative aspect-[2/3] w-full max-w-[260px] mx-auto overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200 shadow-md dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800 sm:mx-0">
            {book.cover ? (
              <Image
                src={book.cover}
                alt={book.title}
                fill
                unoptimized
                sizes="(max-width: 640px) 260px, 240px"
                className="object-cover transition-transform duration-300 hover:scale-105"
                priority
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <BookOpen className="size-12 text-zinc-400" />
                <p className="mt-3 font-serif text-sm font-semibold text-zinc-700 dark:text-zinc-300 line-clamp-3">
                  {book.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{book.author}</p>
              </div>
            )}

            {/* Badge overlay on cover */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${sourceConfig.badgeClass}`}>
                {sourceConfig.name}
              </span>
            </div>
          </div>

          {/* Details & Action Controls */}
          <div className="flex flex-col justify-start">
            {/* Badges Header */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${accessBadge.classes}`}>
                {accessBadge.label}
              </span>

              {book.format === "pdf" && (
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                  PDF Document
                </span>
              )}

              {book.language && (
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <Globe className="size-3" />
                  {book.language}
                </span>
              )}

              {book.year && (
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <Calendar className="size-3" />
                  {book.year}
                </span>
              )}
            </div>

            {/* Book Title & Author */}
            <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl dark:text-zinc-100">
              {book.title}
            </h1>
            <p className="mt-2 text-base font-medium text-zinc-600 dark:text-zinc-400">
              by <span className="text-zinc-900 dark:text-zinc-200">{book.author || "Unknown"}</span>
            </p>

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* Read Button */}
              {canRead && (
                <Link
                  href={readerPath}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all"
                >
                  <BookOpen className="size-4" />
                  <span>{book.format === "pdf" ? "Read PDF" : "Start Reading"}</span>
                  {isPreloaded && (
                    <span className="flex size-1.5 rounded-full bg-emerald-300 animate-pulse" title="Ready to read instantly" />
                  )}
                </Link>
              )}

              {/* Borrow on Internet Archive */}
              {book.access === "borrowable" && book.readUrl && (
                <a
                  href={book.readUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
                >
                  <ExternalLink className="size-3.5" /> Borrow on Internet Archive
                </a>
              )}

              {/* External Publisher Link */}
              {book.external && book.readUrl && (
                <a
                  href={book.readUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                >
                  <span>Publisher Page</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}

              {/* Add to Library Button with Status Picker */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-xs transition-all ${
                  isInLibrary
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {isInLibrary ? (
                  <>
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>In Library · {STATUS_LABELS[currentLibraryStatus]}</span>
                  </>
                ) : (
                  <>
                    <Library className="size-3.5" />
                    <span>Add to Library</span>
                  </>
                )}
              </button>

              {/* Mark as Favourite Toggle */}
              <button
                type="button"
                onClick={toggleFavourite}
                disabled={isFavLoading}
                title={isFavourite ? "Remove from favourites" : "Mark as favourite"}
                className={`inline-flex size-10 items-center justify-center rounded-xl border transition-all ${
                  isFavourite
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 shadow-xs"
                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-zinc-800"
                }`}
                aria-label={isFavourite ? "Favorited" : "Add to favourites"}
              >
                {isFavLoading ? (
                  <Loader2 className="size-4 animate-spin text-zinc-400" />
                ) : (
                  <Heart className={`size-4 transition-transform ${isFavourite ? "fill-rose-500 scale-110" : ""}`} />
                )}
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
                title="Share this book"
                aria-label="Share this book"
              >
                {copiedShare ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
                {copiedShare && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
                    Copied!
                  </span>
                )}
              </button>
            </div>

            {/* Description Block */}
            {descriptionText ? (
              <div className="mt-7">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Overview & Synopsis
                </h2>
                <div className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <p className="whitespace-pre-line">{displayDesc}</p>
                  {isLongDesc && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {isDescExpanded ? "Show less" : "Read full synopsis"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500">
                No synopsis provided by {sourceConfig.name}.
              </div>
            )}

            {/* Subjects / Genre Pills */}
            {book.subjects && book.subjects.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Tag className="size-3.5" />
                  <span>Subjects & Categories</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {book.subjects.map((sub, index) => (
                    <span
                      key={index}
                      className="inline-block rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Related Books Section */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Related Books
                </h2>
                <p className="text-xs text-zinc-500">
                  More works matching {book.subjects?.[0] ? `"${book.subjects[0]}"` : book.author}
                </p>
              </div>
              <Sparkles className="size-5 text-amber-500" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {related.map((item) => (
                <Link
                  key={`${item.source}-${item.id}`}
                  href={`/book/${item.source}/${encodeURIComponent(String(item.id))}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 shadow-xs hover:border-emerald-600 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {item.cover ? (
                      <Image
                        src={item.cover}
                        alt={item.title}
                        fill
                        unoptimized
                        sizes="160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="size-8 m-auto inset-0 absolute text-zinc-400" />
                    )}
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-xs">
                      {item.source}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-medium text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                    {item.author || "Unknown"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add To Library Modal */}
      {isModalOpen && (
        <AddToLibraryModal
          book={book}
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsInLibrary(true);
            checkLibraryState();
          }}
          initialStatus={currentLibraryStatus}
          initialShelfIds={shelfIds}
          initialIsFavourite={isFavourite}
        />
      )}
    </AppShell>
  );
}
