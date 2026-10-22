"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";

interface Community {
  id: string;
  member_count: number;
  post_count: number;
  book: ApiBook;
}

export default function CommunitiesClient() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const load = useCallback(() => {
    return fetch("/api/communities").then((response) => {
      if (!response.ok) throw new Error("Could not load communities.");
      return response.json() as Promise<Community[]>;
    }).then((result) => {
      setCommunities(result);
      setState("success");
    }).catch(() => setState("error"));
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <AppShell><main className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="font-serif text-3xl font-bold">Book communities</h1>
    {state === "loading" && <div className="mt-6 h-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" aria-busy="true" />}
    {state === "error" && <div role="alert" className="py-12 text-center text-sm text-red-700">Could not load communities. <button onClick={() => { setState("loading"); void load(); }} className="ml-2 inline-flex items-center gap-1 underline"><RefreshCw className="size-3" /> Retry</button></div>}
    {state === "success" && communities.length === 0 && <p className="py-12 text-center text-sm text-zinc-500">No book communities found.</p>}
    {state === "success" && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{communities.map(({ id, book, member_count, post_count }) => <Link key={id} href={`/communities/${id}`} className="rounded-lg border border-zinc-200 p-4 hover:border-emerald-600 dark:border-zinc-800">
      <span className="text-[10px] uppercase text-zinc-500">{book.source}</span><h2 className="mt-1 font-serif font-semibold">{book.title}</h2><p className="mt-1 text-sm text-zinc-500">{book.author}</p><p className="mt-3 text-xs text-zinc-500">{member_count} members · {post_count} discussions</p>
    </Link>)}</div>}
  </main></AppShell>;
}
