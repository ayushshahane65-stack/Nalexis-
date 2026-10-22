"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";

export default function AuthorsClient() {
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback((search = "") => {
    const url = search ? `/api/search?q=${encodeURIComponent(search)}` : "/api/popular";
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error("Author search failed.");
      return response.json() as Promise<ApiBook[]>;
    }).then((results) => {
      setBooks(results);
      setStatus("success");
    }).catch(() => {
      setBooks([]);
      setStatus("error");
    });
  }, []);

  useEffect(() => { void load(); }, [load]);
  const authors = Array.from(new Set(books.map((book) => book.author).filter((author) => author && author !== "Unknown")));
  const submit = (event: FormEvent) => { event.preventDefault(); setStatus("loading"); void load(query); };

  return <AppShell><main className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-100">Authors</h1>
    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Authors listed here are taken from live book catalog results.</p>
    <form onSubmit={submit} className="my-6 flex gap-2">
      <label className="sr-only" htmlFor="author-search">Search authors</label>
      <input id="author-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by author name" className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/30" />
      <button className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white"><Search className="size-4" /> Search</button>
    </form>
    {status === "loading" && <div className="animate-pulse py-10 text-sm text-zinc-600 dark:text-zinc-400" aria-busy="true">Loading authors…</div>}
    {status === "error" && <div role="alert" className="py-10 text-center text-sm text-red-700 dark:text-red-400">Could not load authors. <button onClick={() => { setStatus("loading"); void load(query); }} className="ml-2 inline-flex items-center gap-1 underline"><RefreshCw className="size-3" /> Retry</button></div>}
    {status === "success" && authors.length === 0 && <p className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">No books found.</p>}
    {status === "success" && <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{authors.map((author) => <li key={author}><Link href={`/authors/${encodeURIComponent(author)}`} className="block rounded-lg border border-zinc-200 p-4 font-medium text-zinc-900 hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-zinc-800 dark:text-zinc-100 dark:focus-visible:ring-emerald-400">{author}</Link></li>)}</ul>}
  </main></AppShell>;
}
