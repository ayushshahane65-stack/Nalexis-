"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { ApiBook } from "@/lib/books";
import AppShell from "@/components/app/AppShell";

interface Props { params: Promise<{ id: string }> }
interface Community { id: string; member_count: number; post_count: number; book: ApiBook }

export default function CommunityPage({ params }: Props) {
  const { id } = use(params);
  const [community, setCommunity] = useState<Community | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const load = useCallback(() => {
    return fetch(`/api/communities/${encodeURIComponent(id)}`).then((response) => {
      if (!response.ok) throw new Error("Could not load community.");
      return response.json() as Promise<Community>;
    }).then((result) => {
      setCommunity(result);
      setState("success");
    }).catch(() => setState("error"));
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  return <AppShell><main className="mx-auto max-w-4xl px-4 py-8">
    <Link href="/communities" className="text-sm text-emerald-700">Communities</Link>
    {state === "loading" && <div className="mt-6 h-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" aria-busy="true" />}
    {state === "error" && <div role="alert" className="py-12 text-sm text-red-700">Could not load this community. <button onClick={() => { setState("loading"); void load(); }} className="underline"><RefreshCw className="inline size-3" /> Retry</button></div>}
    {state === "success" && community && <section className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="text-xs uppercase text-zinc-500">{community.book.source}</p><h1 className="mt-2 font-serif text-2xl font-bold">{community.book.title}</h1><p className="mt-1 text-zinc-500">{community.book.author}</p>
      <div className="mt-5 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400"><span>{community.member_count} members</span><span>{community.post_count} discussions</span></div>
      <Link href={`/book/${community.book.source}/${encodeURIComponent(String(community.book.id))}`} className="mt-5 inline-block text-sm text-emerald-700 underline">View book details</Link>
    </section>}
  </main></AppShell>;
}
