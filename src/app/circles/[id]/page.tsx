"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ApiBook } from "@/lib/books";

interface Circle { id: string; name: string; description: string | null; member_count: number; book: ApiBook }
interface Props { params: Promise<{ id: string }> }

export default function CirclePage({ params }: Props) {
  const { id } = use(params);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const load = useCallback(() => {
    return fetch(`/api/circles/${encodeURIComponent(id)}`).then((response) => {
      if (!response.ok) throw new Error("Could not load this circle.");
      return response.json() as Promise<Circle>;
    }).then((result) => {
      setCircle(result);
      setState("success");
    }).catch(() => setState("error"));
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  return <main className="mx-auto max-w-4xl px-4 py-8">
    <Link href="/circles" className="text-sm text-emerald-700">Reading circles</Link>
    {state === "loading" && <div className="mt-6 h-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" aria-busy="true" />}
    {state === "error" && <div role="alert" className="py-12 text-sm text-red-700">Could not load this circle. <button onClick={() => { setState("loading"); void load(); }} className="underline"><RefreshCw className="inline size-3" /> Retry</button></div>}
    {state === "success" && circle && <article className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="text-xs uppercase text-zinc-500">{circle.book.source}</p><h1 className="mt-2 font-serif text-2xl font-bold">{circle.name}</h1><p className="mt-2 text-zinc-600 dark:text-zinc-400">{circle.description}</p>
      <h2 className="mt-6 font-serif text-lg font-semibold">{circle.book.title}</h2><p className="text-sm text-zinc-500">{circle.book.author}</p>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{circle.member_count} members</p>
      <Link href={`/book/${circle.book.source}/${encodeURIComponent(String(circle.book.id))}`} className="mt-5 inline-block text-sm text-emerald-700 underline">View book details</Link>
    </article>}
  </main>;
}
