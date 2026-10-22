"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import { isReadableBook, type ApiBook } from "@/lib/books";

type BrowseBook = ApiBook;

const CATEGORIES = [
  { key: "popular",          label: "Popular"    },
  { key: "classics",         label: "Classics"   },
  { key: "romance",          label: "Romance"    },
  { key: "adventure",        label: "Adventure"  },
  { key: "crime",            label: "Mystery"    },
  { key: "science fiction",  label: "Sci-Fi"     },
  { key: "poetry",           label: "Poetry"     },
  { key: "philosophy",       label: "Philosophy" },
  { key: "drama",            label: "Drama"      },
  { key: "textbooks & academic", label: "Textbooks & Academic" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function CardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-60 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2.5 h-7 w-full rounded-md bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function BookBrowseCard({ book }: { book: BrowseBook }) {
  const access = book.access ?? "public";
  const isPdf = book.format === "pdf";
  const canRead = isReadableBook(book);
  const detailHref = `/book/${book.source}/${encodeURIComponent(String(book.id))}`;
  const readHref = `/reader/${book.source}/${encodeURIComponent(String(book.id))}`;
  return (
    <article className="group flex flex-col gap-2.5" aria-label={`${book.title} by ${book.author}`}>
      <div
        className="relative h-60 w-full overflow-hidden rounded-lg border border-zinc-200/80 shadow-xs transition-transform duration-150 group-hover:-translate-y-1 dark:border-zinc-800"
        style={{ background: "#f4f4f5" }}
      >
        {book.cover && (
          <Image src={book.cover} alt={book.title} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,20vw" className="object-cover" unoptimized />
        )}
        {!book.cover && <BookOpen className="absolute inset-0 m-auto size-10 text-zinc-400" aria-hidden="true" />}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-black/20" />
        <div className="absolute right-2 top-2">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {book.source === "gutenberg" ? "Gutenberg" : book.source === "openlibrary" ? "Open Library" : book.source.toUpperCase()}
          </span>
        </div>
        {isPdf && !book.external && (
          <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800">PDF</span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
          <p className="line-clamp-2 font-serif text-xs font-semibold leading-tight text-white">{book.title}</p>
        </div>
      </div>
      <Link href={detailHref} className="flex flex-col gap-0.5">
        <h3 className="line-clamp-2 font-serif text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{book.title}</h3>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{book.author}</p>
        <span className="mt-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          {access === "borrowable" ? "Borrowable" : access === "no_ebook" ? "Details only" : "Free"}
        </span>
      </Link>
      {book.external && book.readUrl ? (
        <a href={book.readUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
          <span>Publisher</span><ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : canRead ? (
        <Link href={readHref}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500">
          <BookOpen className="size-3.5" aria-hidden="true" />
          <span>{isPdf ? "Read PDF" : "Read"}</span>
          {!isPdf && <ExternalLink className="size-3" aria-hidden="true" />}
        </Link>
      ) : access === "borrowable" && book.readUrl ? (
        <a href={book.readUrl} target="_blank" rel="noopener noreferrer" className="text-center text-xs text-emerald-700 underline">Borrow on Internet Archive</a>
      ) : (
        <span className="text-center text-xs text-zinc-400 dark:text-zinc-600">Info only</span>
      )}
    </article>
  );
}

export default function HomeDashboard() {
  const [category, setCategory] = useState<CategoryKey>("popular");
  const [books, setBooks] = useState<BrowseBook[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBooks = useCallback((cat: CategoryKey, pg: number, append: boolean) => {
    const endpoint = cat === "popular"
      ? `/api/popular?page=${pg}`
      : `/api/browse?category=${encodeURIComponent(cat)}&page=${pg}`;
    return fetch(endpoint).then((res) => {
      if (!res.ok) throw new Error("Fetch failed");
      return res.json() as Promise<BrowseBook[]>;
    }).then((data) => {
      setBooks((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length >= 10);
      setStatus("success");
    }).catch(() => {
      if (!append) setStatus("error");
      setHasMore(false);
    }).finally(() => {
      setLoadingMore(false);
    });
  }, []);

  useEffect(() => {
    fetchBooks(category, 1, false);
  }, [category, fetchBooks]);

  const changeCategory = (next: CategoryKey) => {
    setBooks([]);
    setPage(1);
    setHasMore(true);
    setStatus("loading");
    setCategory(next);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchBooks(category, next, true);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Project Gutenberg, Open Library, OAPEN &amp; DOAB</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">Browse Free Books</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Free books sourced live from Project Gutenberg, Open Library, OAPEN, and DOAB.
          </p>
        </header>

        <nav aria-label="Book categories" className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2">
            {CATEGORIES.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => changeCategory(key)}
                className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                  category === key
                    ? "bg-emerald-700 text-white shadow-xs dark:bg-emerald-600"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </nav>

        {status === "loading" && (
          <div aria-busy="true" aria-label="Loading books" className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50 p-12 text-center dark:border-red-900 dark:bg-red-950/40">
            <AlertCircle className="size-7 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-300">Could not load books right now.</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Check your connection and try again.</p>
            <button type="button" onClick={() => { setStatus("loading"); fetchBooks(category, 1, false); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3.5 py-2 text-xs font-medium text-red-800 shadow-xs hover:bg-red-50 active:scale-[0.98] dark:border-red-800 dark:bg-zinc-900 dark:text-red-300">
              <RefreshCw className="size-3.5" /><span>Retry</span>
            </button>
          </div>
        )}

        {status === "success" && books.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <BookOpen className="size-8 text-zinc-400" />
            <h2 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">No books found in this category</h2>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">Try a different category or check back later.</p>
          </div>
        )}

        {status === "success" && books.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((book) => <BookBrowseCard key={`${book.source}-${book.id}`} book={book} />)}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button type="button" onClick={handleLoadMore} disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  {loadingMore
                    ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Loading...</span></>
                    : <><ChevronDown className="size-4" aria-hidden="true" /><span>Load more</span></>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
