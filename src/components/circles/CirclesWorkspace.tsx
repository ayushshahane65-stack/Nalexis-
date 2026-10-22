"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ApiBook } from "@/lib/books";

interface Circle { id: string; name: string; description: string | null; member_count: number; book: ApiBook }

export default function CirclesWorkspace() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const load = useCallback(() => {
    return fetch("/api/circles").then((response) => {
      if (!response.ok) throw new Error("Could not load reading circles.");
      return response.json() as Promise<Circle[]>;
    }).then((result) => {
      setCircles(result);
      setState("success");
    }).catch(() => setState("error"));
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <main className="mx-auto max-w-6xl px-4 py-8">
    <h1 className="font-serif text-3xl font-bold">Reading circles</h1>
    {state === "loading" && <div className="mt-6 h-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" aria-busy="true" />}
    {state === "error" && <div role="alert" className="py-12 text-center text-sm text-red-700">Could not load reading circles. <button onClick={() => { setState("loading"); void load(); }} className="ml-2 underline"><RefreshCw className="inline size-3" /> Retry</button></div>}
    {state === "success" && circles.length === 0 && <p className="py-12 text-center text-sm text-zinc-500">No reading circles found.</p>}
    {state === "success" && <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{circles.map((circle) => <li key={circle.id}><Link href={`/circles/${circle.id}`} className="block rounded-lg border border-zinc-200 p-4 hover:border-emerald-600 dark:border-zinc-800"><span className="text-[10px] uppercase text-zinc-500">{circle.book.source}</span><h2 className="mt-1 font-serif font-semibold">{circle.name}</h2><p className="mt-2 text-sm">{circle.book.title}</p><p className="mt-1 text-xs text-zinc-500">{circle.member_count} members</p></Link></li>)}</ul>}
  </main>;
}
