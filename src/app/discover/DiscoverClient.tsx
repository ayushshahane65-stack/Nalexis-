"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ExternalLink, RefreshCw, Search } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import { isReadableBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";

type LoadState = "loading" | "success" | "error";

function BookPlaceholder() {
  return <div className="flex h-60 items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800"><BookOpen className="size-10" aria-hidden="true" /></div>;
}

export default function DiscoverClient() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback((search?: string) => {
    const url = search?.trim()
      ? `/api/search?q=${encodeURIComponent(search.trim())}`
      : "/api/popular";
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error("Book search failed.");
      return response.json() as Promise<ApiBook[]>;
    }).then((result) => {
      setBooks(result);
      setState("success");
    }).catch(() => {
      setBooks([]);
      setState("error");
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    void load(query);
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Gutenberg · Open Library · OAPEN · DOAB</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-100">Discover books</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Search or browse books returned by the connected catalogs.</p>
        </header>

        <form onSubmit={submit} className="mb-8 flex gap-2">
          <label className="sr-only" htmlFor="book-query">Search books</label>
          <input id="book-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or author" className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white"><Search className="size-4" /> Search</button>
        </form>

        {state === "loading" && <div aria-busy="true" className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => <div key={index} className="animate-pulse"><div className="h-60 rounded-lg bg-zinc-200 dark:bg-zinc-800" /><div className="mt-3 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" /><div className="mt-2 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" /></div>)}
        </div>}

        {state === "error" && <div role="alert" className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-red-700 dark:text-red-400">Could not load books. Please try again.</p>
          <button onClick={() => { setState("loading"); void load(query); }} className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm"><RefreshCw className="size-4" /> Retry</button>
        </div>}

        {state === "success" && books.length === 0 && <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">No books found.</p>}

        {state === "success" && books.length > 0 && <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((book) => {
            const detailsHref = `/book/${book.source}/${encodeURIComponent(String(book.id))}`;
            const readHref = `/reader/${book.source}/${encodeURIComponent(String(book.id))}`;
            const free = book.access === "free" || book.access === "public";
            const canRead = isReadableBook(book);
            return <article key={`${book.source}-${book.id}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <Link href={detailsHref} className="relative block h-60">
                {book.cover ? <Image src={book.cover} alt={book.title} fill unoptimized className="object-cover" /> : <BookPlaceholder />}
                {book.format === "pdf" && !book.external && <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-zinc-900">PDF</span>}
              </Link>
              <div className="p-3">
                <p className="text-[10px] font-medium uppercase text-zinc-500">{book.source}</p>
                <Link href={detailsHref} className="mt-1 block line-clamp-2 font-serif text-sm font-semibold">{book.title}</Link>
                <p className="mt-1 truncate text-xs text-zinc-500">{book.author}</p>
                <p className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400">{free ? "Free" : book.access === "borrowable" ? "Borrow" : "Details only"}</p>
                {book.external && book.readUrl
                  ? <a href={book.readUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700">Publisher <ExternalLink className="size-3" /></a>
                  : canRead
                    ? <Link href={readHref} className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700">Read <ExternalLink className="size-3" /></Link>
                    : book.access === "borrowable" && book.readUrl
                      ? <a href={book.readUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-xs text-emerald-700 underline">Borrow on Internet Archive</a>
                      : <span className="mt-3 inline-flex text-xs text-zinc-500">Info only</span>}
              </div>
            </article>;
          })}
        </div>}
      </main>
    </AppShell>
  );
}
