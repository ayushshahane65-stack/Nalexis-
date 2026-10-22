"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Folder,
  Globe,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import ReadingJourneyTimeline, { type JourneyEventItem } from "@/components/profile/ReadingJourneyTimeline";
import ShelfCollage from "@/components/library/ShelfCollage";
import type { ApiBook } from "@/lib/books";

interface PublicProfileData {
  profile: {
    username: string | null;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    avatar_color: string;
    favourite_genres: string[];
    favourite_authors: string[];
    yearly_goal: number;
    goal_year: number;
  };
  stats: {
    books_completed: number;
    shared_quotes: number;
  };
  shelves: Array<{
    id: string;
    name: string;
    description: string | null;
    cover_image: string | null;
    order_index: number;
    is_default: boolean;
    slug: string | null;
    book_count: number;
    books?: Array<{ source: string; book_id: string }>;
  }>;
  reflections: Array<{
    source: string;
    book_id: string;
    rating: number | null;
    reflection: string | null;
    finished_at: string | null;
    book?: ApiBook;
  }>;
  quotes: Array<{
    id: string;
    source: string;
    book_id: string;
    text: string;
    note: string | null;
    created_at: string;
  }>;
  journey: JourneyEventItem[];
}

export default function PublicProfileClient({ username }: { username: string }) {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    fetch(`/api/public/u/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load user profile");
        const json: PublicProfileData = await res.json();

        // Resolve books metadata for shared reflections
        const resolvedReflections = await Promise.all(
          json.reflections.map(async (r) => {
            try {
              const dRes = await fetch(`/api/books/${r.source}/${encodeURIComponent(r.book_id)}`);
              if (dRes.ok) {
                return { ...r, book: await dRes.json() };
              }
            } catch {
              // fallback
            }
            return r;
          })
        );

        setData({ ...json, reflections: resolvedReflections });
      })
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, [username]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-16 animate-pulse space-y-6">
          <div className="flex items-center gap-6">
            <div className="size-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  if (hasError || !data) {
    return (
      <AppShell>
        <main className="mx-auto max-w-xl px-4 py-24 text-center space-y-4">
          <BookOpen className="size-10 mx-auto text-zinc-400" />
          <h1 className="font-serif text-2xl font-bold text-[var(--text)]">Living Library Not Found</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            The profile &ldquo;@{username}&rdquo; does not exist or has not made any shelves public yet.
          </p>
          <div className="pt-2">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white shadow-xs"
            >
              Return Home
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const { profile, stats, shelves, reflections, quotes, journey } = data;
  const displayName = profile.display_name || profile.username || "Reader";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const yearlyGoal = profile.yearly_goal || 12;
  const completedCount = stats.books_completed || 0;
  const goalPercent = Math.min(100, Math.round((completedCount / yearlyGoal) * 100));

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-10">
        {/* Profile Card Header */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div
                style={{ backgroundColor: profile.avatar_url ? undefined : profile.avatar_color }}
                className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl overflow-hidden text-2xl font-serif font-bold text-white shadow-md"
              >
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={displayName} fill unoptimized className="object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">{displayName}</h1>
                  {profile.username && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">@{profile.username}</span>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {profile.favourite_genres?.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-[var(--primary)] dark:bg-emerald-950/50"
                    >
                      {genre}
                    </span>
                  ))}
                  {profile.favourite_authors?.map((author) => (
                    <span
                      key={author}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {author}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-zinc-50 px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] dark:bg-zinc-900/60">
              <Globe className="size-3 text-emerald-600" />
              <span>Living Library</span>
            </div>
          </div>

          {/* Yearly Reading Goal Progress Bar */}
          <div className="border-t border-[var(--border)] pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                <Trophy className="size-3.5 text-amber-500" />
                <span>
                  {profile.goal_year || new Date().getFullYear()} Reading Goal: {completedCount} of {yearlyGoal} books read
                </span>
              </div>
              <span className="font-semibold text-[var(--primary)]">{goalPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-500 rounded-full"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Public Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">Books Completed</p>
            <p className="font-serif text-2xl font-bold text-[var(--text)]">{stats.books_completed}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">Shared Quotes</p>
            <p className="font-serif text-2xl font-bold text-[var(--text)]">{stats.shared_quotes}</p>
          </div>
        </section>

        {/* Public Shelves */}
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--text)]">Curated Shelves</h2>
            <p className="text-xs text-[var(--text-muted)]">Public bookshelves curated by {displayName}</p>
          </div>

          {shelves.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/50 p-8 text-center dark:bg-zinc-900/30">
              <Folder className="size-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs text-[var(--text-muted)]">This reader has not made any shelves public yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shelves.map((shelf) => (
                <div
                  key={shelf.id}
                  className="flex items-start gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs"
                >
                  <ShelfCollage
                    customCover={shelf.cover_image}
                    bookCovers={[]}
                    size="sm"
                  />
                  <div className="flex-1 space-y-1">
                    <h3 className="font-serif text-sm font-bold text-[var(--text)] line-clamp-1">{shelf.name}</h3>
                    {shelf.description && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {shelf.description}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] pt-1">
                      {shelf.book_count} {shelf.book_count === 1 ? "book" : "books"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Public Reflections */}
        {reflections.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Reflections & Notes</h2>
              <p className="text-xs text-[var(--text-muted)]">Thoughts and impressions shared on completed books</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reflections.map((r) => (
                <div
                  key={`${r.source}:${r.book_id}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-[var(--text)] line-clamp-1">
                        {r.book?.title || `Book ${r.book_id}`}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">{r.book?.author || r.source}</p>
                    </div>

                    {r.rating && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-[var(--text)]">{r.rating}</span>
                      </div>
                    )}
                  </div>

                  {r.reflection && (
                    <p className="font-serif italic text-xs leading-relaxed text-[var(--text)] mt-2">
                      &ldquo;{r.reflection}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Public Shared Quotes */}
        {quotes.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Shared Passages</h2>
              <p className="text-xs text-[var(--text-muted)]">Memorable lines selected by {displayName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-2"
                >
                  <blockquote className="font-serif italic text-xs leading-relaxed text-[var(--text)]">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>
                  {q.note && <p className="text-[11px] text-[var(--text-muted)]">{q.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reading Journey Milestones */}
        {journey.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Reading Journey</h2>
              <p className="text-xs text-[var(--text-muted)]">Completed books and milestones</p>
            </div>
            <ReadingJourneyTimeline events={journey} />
          </section>
        )}
      </main>
    </AppShell>
  );
}
