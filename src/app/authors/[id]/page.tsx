"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";

interface Props { params: Promise<{ id: string }> }

export default function AuthorPage({ params }: Props) {
  const { id } = use(params);
  const author = decodeURIComponent(id);
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(() => {
    return fetch(`/api/search?q=${encodeURIComponent(author)}`).then((response) => {
      if (!response.ok) throw new Error("Search failed.");
      return response.json() as Promise<ApiBook[]>;
    }).then((results) => {
      setBooks(results.filter((book) => book.author.toLowerCase().includes(author.toLowerCase())));
      setState("success");
    }).catch(() => setState("error"));
  }, [author]);
  useEffect(() => { void load(); }, [load]);

  return <AppShell><main className="mx-auto max-w-6xl px-4 py-8">
    <Link href="/authors" className="text-sm text-emerald-700">Authors</Link>
    <h1 className="mt-4 font-serif text-3xl font-bold">{author}</h1>
    {state === "loading" && <div className="mt-8 h-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" aria-busy="true" />}
    {state === "error" && <div role="alert" className="py-10 text-sm text-red-700">Could not load books for this author. <button onClick={() => { setState("loading"); void load(); }} className="underline"><RefreshCw className="inline size-3" /> Retry</button></div>}
    {state === "success" && books.length === 0 && <p className="py-10 text-sm text-zinc-500">No books found.</p>}
    {state === "success" && books.length > 0 && <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <li key={`${book.source}-${book.id}`}><Link href={`/book/${book.source}/${encodeURIComponent(String(book.id))}`} className="block rounded-lg border border-zinc-200 p-4 hover:border-emerald-600 dark:border-zinc-800"><span className="text-[10px] uppercase text-zinc-500">{book.source}</span><p className="mt-1 font-serif font-semibold">{book.title}</p></Link></li>)}</ul>}
  </main></AppShell>;
}
