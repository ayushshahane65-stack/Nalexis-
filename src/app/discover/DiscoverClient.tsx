"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, RefreshCw, Search } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";
import AddToLibraryButton from "@/components/library/AddToLibraryButton";

type LoadState = "loading" | "success" | "error";

function BookPlaceholder() {
  return (
    <div className="flex h-64 w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
      <BookOpen className="size-10" aria-hidden="true" />
    </div>
  );
}

export default function DiscoverClient() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback((search?: string) => {
    const url = search?.trim()
      ? `/api/search?q=${encodeURIComponent(search.trim())}`
      : "/api/popular";
    return fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Book search failed.");
        return response.json() as Promise<ApiBook[]>;
      })
      .then((result) => {
        setBooks(result);
        setState("success");
      })
      .catch(() => {
        setBooks([]);
        setState("error");
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    void load(query);
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Gutenberg · Open Library · OAPEN · DOAB
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Discover Books
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Explore public-domain classics, modern open volumes, and peer-reviewed academic works.
          </p>
        </header>

        {/* Search Bar with high-contrast text */}
        <form onSubmit={submit} className="mb-8 flex gap-2.5">
          <label className="sr-only" htmlFor="book-query">
            Search books
          </label>
          <div className="relative min-w-0 flex-1">
            <input
              id="book-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author, or topic (e.g. Frankenstein, Darwin, Philosophy)..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 shadow-xs focus:border-emerald-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition-all"
          >
            <Search className="size-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Loading state skeleton */}
        {state === "loading" && (
          <div aria-busy="true" className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2.5 animate-pulse">
                <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div role="alert" className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Could not load books from the catalogs. Please try again.
            </p>
            <button
              onClick={() => {
                setState("loading");
                void load(query);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {state === "success" && books.length === 0 && (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto size-12 text-zinc-400" />
            <h2 className="mt-3 font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">
              No books found
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Try searching with another title, author, or keyword.
            </p>
          </div>
        )}

        {/* Book Grid */}
        {state === "success" && books.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => {
              const detailsHref = `/book/${book.source}/${encodeURIComponent(String(book.id))}`;
              const free = book.access === "free" || book.access === "public";
              const sourceLabel =
                book.source === "gutenberg"
                  ? "Gutenberg"
                  : book.source === "openlibrary"
                  ? "Open Library"
                  : book.source.toUpperCase();

              return (
                <article
                  key={`${book.source}-${book.id}`}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    {/* Cover Image Container */}
                    <Link href={detailsHref} className="relative block h-64 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {book.cover ? (
                        <Image
                          src={book.cover}
                          alt={book.title}
                          fill
                          unoptimized
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-103"
                        />
                      ) : (
                        <BookPlaceholder />
                      )}

                      {/* Source Badge overlay */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                          {sourceLabel}
                        </span>
                      </div>

                      {/* PDF format badge */}
                      {book.format === "pdf" && !book.external && (
                        <span className="absolute bottom-2.5 left-2.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900 shadow-xs">
                          PDF
                        </span>
                      )}

                      {/* Add to library icon quick action */}
                      <div
                        className="absolute top-2.5 right-2.5 z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <AddToLibraryButton book={book} variant="icon" />
                      </div>
                    </Link>

                    {/* Book Metadata with crisp typography */}
                    <div className="p-3.5">
                      <Link
                        href={detailsHref}
                        className="block font-serif text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2"
                        title={book.title}
                      >
                        {book.title}
                      </Link>

                      <p className="mt-1 truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {book.author || "Unknown Author"}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {free ? "Free access" : book.access === "borrowable" ? "Borrow on IA" : "Details only"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="p-3.5 pt-0">
                    <Link
                      href={detailsHref}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs hover:border-emerald-600 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 active:scale-[0.98] transition-all"
                    >
                      <BookOpen className="size-3.5" />
                      <span>View Book</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
