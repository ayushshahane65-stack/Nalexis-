"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Feather,
  Folder,
  Globe,
  Heart,
  MessageSquareQuote,
  Quote,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import ReadingJourneyTimeline, { type JourneyEventItem } from "@/components/profile/ReadingJourneyTimeline";
import {
  getLocalLiteraryProfile,
  getLocalLibraryBooks,
  getLocalShelves,
} from "@/lib/local-library";
import type { ApiBook } from "@/lib/books";

interface PublicProfileData {
  profile: {
    username: string | null;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    avatar_color: string;
    cover_image: string | null;
    reading_philosophy: string | null;
    literary_interests: string[];
    favourite_genres: string[];
    favourite_authors: string[];
    yearly_goal: number;
    goal_year: number;
    featured_book: {
      source: string;
      id: string;
      title: string;
      author: string;
      cover?: string | null;
    } | null;
    theme_accent: string;
    showcase_flags: {
      favourites: boolean;
      currently_reading: boolean;
      completed: boolean;
      quotes: boolean;
      journey: boolean;
    };
  };
  stats: {
    books_completed: number;
    public_shelves: number;
    shared_quotes: number;
    favourite_books: number;
  };
  shelves: Array<{
    id: string;
    name: string;
    description: string | null;
    cover_image: string | null;
    book_count: number;
    books?: Array<{ source: string; book_id: string }>;
  }>;
  showcase: {
    favourites: Array<{
      source: string;
      book_id: string;
      rating?: number | null;
      book?: ApiBook;
    }>;
    currently_reading: Array<{
      source: string;
      book_id: string;
      progress: number;
      book?: ApiBook;
    }>;
    completed: Array<{
      source: string;
      book_id: string;
      rating?: number | null;
      book?: ApiBook;
    }>;
  };
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
  const [activeTab, setActiveTab] = useState<"showcase" | "shelves" | "reflections" | "quotes" | "journey">("showcase");

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    fetch(`/api/public/u/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load user profile");
        const json: PublicProfileData = await res.json();

        // Concurrently resolve book details for reflections and showcases
        const resolveBook = async (source: string, book_id: string): Promise<ApiBook | undefined> => {
          try {
            const dRes = await fetch(`/api/books/${source}/${encodeURIComponent(book_id)}`);
            if (dRes.ok) return await dRes.json();
          } catch {}
          return undefined;
        };

        const [resolvedReflections, resolvedFavs, resolvedReading, resolvedCompleted] = await Promise.all([
          Promise.all(
            (json.reflections || []).map(async (r) => ({
              ...r,
              book: await resolveBook(r.source, r.book_id),
            }))
          ),
          Promise.all(
            (json.showcase?.favourites || []).map(async (f) => ({
              ...f,
              book: await resolveBook(f.source, f.book_id),
            }))
          ),
          Promise.all(
            (json.showcase?.currently_reading || []).map(async (cr) => ({
              ...cr,
              book: await resolveBook(cr.source, cr.book_id),
            }))
          ),
          Promise.all(
            (json.showcase?.completed || []).map(async (c) => ({
              ...c,
              book: await resolveBook(c.source, c.book_id),
            }))
          ),
        ]);

        setData({
          ...json,
          reflections: resolvedReflections,
          showcase: {
            favourites: resolvedFavs,
            currently_reading: resolvedReading,
            completed: resolvedCompleted,
          },
        });
      })
      .catch(() => {
        const localProf = getLocalLiteraryProfile();
        if (
          localProf.username &&
          (localProf.username.toLowerCase() === username.toLowerCase() || username === "scholar")
        ) {
          const localBooks = getLocalLibraryBooks();
          const localShelves = getLocalShelves();
          setData({
            profile: {
              username: localProf.username,
              display_name: localProf.display_name,
              bio: localProf.bio,
              avatar_url: localProf.avatar_url,
              avatar_color: localProf.avatar_color,
              cover_image: localProf.cover_image,
              reading_philosophy: localProf.reading_philosophy,
              literary_interests: localProf.literary_interests,
              favourite_genres: localProf.favourite_genres,
              favourite_authors: localProf.favourite_authors,
              yearly_goal: localProf.yearly_goal,
              goal_year: new Date().getFullYear(),
              featured_book: null,
              theme_accent: localProf.theme_accent,
              showcase_flags: {
                favourites: localProf.showcase_favourites,
                currently_reading: localProf.showcase_currently_reading,
                completed: localProf.showcase_completed,
                quotes: localProf.showcase_quotes,
                journey: localProf.showcase_journey,
              },
            },
            stats: {
              books_completed: localBooks.filter((b) => b.status === "finished").length || 3,
              public_shelves: localShelves.filter((s) => s.is_public).length,
              shared_quotes: 1,
              favourite_books: localBooks.filter((b) => b.is_favourite).length || 2,
            },
            shelves: localShelves
              .filter((s) => s.is_public)
              .map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description ?? null,
                cover_image: null,
                book_count: localBooks.filter((b) => b.shelf_ids?.includes(s.id)).length,
              })),
            showcase: {
              favourites: localBooks
                .filter((b) => b.is_favourite)
                .map((b) => ({
                  source: b.source,
                  book_id: b.book_id,
                  rating: b.rating,
                  book: {
                    id: b.book_id,
                    title: b.title || `Book #${b.book_id}`,
                    author: b.author || "Unknown",
                    cover: b.cover || null,
                    readUrl: null,
                    description: "",
                    source: b.source as any,
                    access: "free",
                  },
                })),
              currently_reading: localBooks
                .filter((b) => b.status === "currently_reading")
                .map((b) => ({
                  source: b.source,
                  book_id: b.book_id,
                  progress: b.progress,
                  book: {
                    id: b.book_id,
                    title: b.title || `Book #${b.book_id}`,
                    author: b.author || "Unknown",
                    cover: b.cover || null,
                    readUrl: null,
                    description: "",
                    source: b.source as any,
                    access: "free",
                  },
                })),
              completed: localBooks
                .filter((b) => b.status === "finished")
                .map((b) => ({
                  source: b.source,
                  book_id: b.book_id,
                  rating: b.rating,
                  book: {
                    id: b.book_id,
                    title: b.title || `Book #${b.book_id}`,
                    author: b.author || "Unknown",
                    cover: b.cover || null,
                    readUrl: null,
                    description: "",
                    source: b.source as any,
                    access: "free",
                  },
                })),
            },
            reflections: [],
            quotes: [
              {
                id: "q-1",
                source: "gutenberg",
                book_id: "84",
                text: "Beware; for I am fearless, and therefore powerful.",
                note: "Mary Shelley — Frankenstein",
                created_at: new Date().toISOString(),
              },
            ],
            journey: [
              {
                event_type: "finished_book",
                source: "gutenberg",
                book_id: "84",
                created_at: new Date().toISOString(),
                metadata: { title: "Finished Frankenstein" },
              },
            ],
          });
        } else {
          setHasError(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [username]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-12 animate-pulse space-y-8">
          <div className="h-48 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-6">
            <div className="size-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
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
        <main className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <Feather className="mx-auto size-12 text-zinc-400" />
          <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Reader Not Found
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            We couldn’t find a literary profile for <span className="font-mono">@{username}</span>. They may have changed their username or made their profile private.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800"
          >
            Explore Discover
          </Link>
        </main>
      </AppShell>
    );
  }

  const { profile, stats, showcase, shelves, reflections, quotes, journey } = data;
  const goal = profile.yearly_goal || 12;
  const progressPercent = Math.min(100, Math.round((stats.books_completed / goal) * 100));

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-8">
        {/* Cover Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 shadow-md">
          <div className="relative h-44 sm:h-56 w-full overflow-hidden">
            {profile.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.cover_image}
                alt="Profile cover banner"
                className="h-full w-full object-cover object-center filter brightness-90"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-emerald-950 via-zinc-900 to-stone-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Reader Profile Header Bar */}
          <div className="relative px-6 pb-6 pt-0 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16">
              {/* Avatar & Reader Identifiers */}
              <div className="flex items-end gap-4">
                <div className="relative size-24 sm:size-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white dark:border-zinc-900 shadow-lg bg-zinc-800">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name ?? "Reader"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-white"
                      style={{ backgroundColor: profile.avatar_color || "#3F5F52" }}
                    >
                      {(profile.display_name ?? "R").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white drop-shadow-xs">
                      {profile.display_name || "Literary Reader"}
                    </h1>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md border border-emerald-400/30">
                      Reader
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-300">
                    @{profile.username}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Reading Philosophy Callout Banner */}
        {profile.reading_philosophy && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-stone-50 to-emerald-50/40 p-5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-zinc-900/70 dark:to-emerald-950/20 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                <Quote className="size-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Reading Philosophy
                </span>
                <p className="font-serif italic text-sm sm:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  &ldquo;{profile.reading_philosophy}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Literary Interests & Genres */}
        {((profile.literary_interests && profile.literary_interests.length > 0) ||
          (profile.favourite_genres && profile.favourite_genres.length > 0) ||
          (profile.favourite_authors && profile.favourite_authors.length > 0)) && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-4 shadow-xs">
            {profile.literary_interests && profile.literary_interests.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Literary Movements & Interests
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.literary_interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.favourite_genres && profile.favourite_genres.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Favourite Genres
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.favourite_genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.favourite_authors && profile.favourite_authors.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Favourite Authors
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.favourite_authors.map((a) => (
                    <span
                      key={a}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Literary Statistics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Books Completed</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.books_completed}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Public Shelves</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.public_shelves}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Shared Quotes</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.shared_quotes}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">Reading Goal</span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{progressPercent}%</span>
            </div>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.books_completed} <span className="text-sm font-normal text-zinc-400">/ {goal}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("showcase")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "showcase"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Showcased Books
            </button>
            <button
              onClick={() => setActiveTab("shelves")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "shelves"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Public Shelves ({shelves.length})
            </button>
            <button
              onClick={() => setActiveTab("reflections")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "reflections"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Reflections & Reviews ({reflections.length})
            </button>
            <button
              onClick={() => setActiveTab("quotes")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "quotes"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Quotations ({quotes.length})
            </button>
            <button
              onClick={() => setActiveTab("journey")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "journey"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Reading Journey
            </button>
          </div>
        </div>

        {/* TAB 1: Showcased Reads */}
        {activeTab === "showcase" && (
          <div className="space-y-8">
            {/* Currently Reading */}
            {showcase.currently_reading.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-3">
                  <BookOpen className="size-4 text-emerald-700 dark:text-emerald-400" />
                  Currently Reading
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {showcase.currently_reading.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs"
                    >
                      <Link
                        href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        {entry.book?.cover ? (
                          <Image
                            src={entry.book.cover}
                            alt={entry.book.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-3 text-center">
                            <BookOpen className="size-6 text-zinc-400" />
                          </div>
                        )}
                      </Link>
                      <div className="mt-2.5">
                        <Link
                          href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                          className="font-serif text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-emerald-700"
                        >
                          {entry.book?.title ?? `Book #${entry.book_id}`}
                        </Link>
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          {entry.book?.author ?? "Unknown"}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                          <span>Progress</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{entry.progress}%</span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Favourites */}
            {showcase.favourites.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-3">
                  <Heart className="size-4 text-rose-600" />
                  Favourite Volumes
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {showcase.favourites.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs"
                    >
                      <Link
                        href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        {entry.book?.cover ? (
                          <Image
                            src={entry.book.cover}
                            alt={entry.book.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-3 text-center">
                            <BookOpen className="size-6 text-zinc-400" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 rounded-full bg-rose-500/90 p-1 text-white shadow-xs">
                          <Heart className="size-3 fill-white" />
                        </div>
                      </Link>
                      <div className="mt-2.5">
                        <Link
                          href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                          className="font-serif text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-emerald-700"
                        >
                          {entry.book?.title ?? `Book #${entry.book_id}`}
                        </Link>
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          {entry.book?.author ?? "Unknown"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {showcase.completed.length > 0 && (
              <div>
                <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 pb-3">
                  <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
                  Completed Works
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {showcase.completed.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs"
                    >
                      <Link
                        href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        {entry.book?.cover ? (
                          <Image
                            src={entry.book.cover}
                            alt={entry.book.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-3 text-center">
                            <BookOpen className="size-6 text-zinc-400" />
                          </div>
                        )}
                      </Link>
                      <div className="mt-2.5">
                        <Link
                          href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                          className="font-serif text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-emerald-700"
                        >
                          {entry.book?.title ?? `Book #${entry.book_id}`}
                        </Link>
                        <p className="text-[11px] text-zinc-500 line-clamp-1">
                          {entry.book?.author ?? "Unknown"}
                        </p>
                        {entry.rating && (
                          <div className="mt-1 flex items-center gap-0.5 text-amber-500">
                            {[...Array(entry.rating)].map((_, i) => (
                              <Star key={i} className="size-3 fill-amber-500" />
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {showcase.currently_reading.length === 0 &&
              showcase.favourites.length === 0 &&
              showcase.completed.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                  <BookOpen className="mx-auto size-10 text-zinc-400" />
                  <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                    No public showcase books yet
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    This reader hasn’t showcased reading lists yet.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* TAB 2: Public Shelves */}
        {activeTab === "shelves" && (
          <div className="space-y-6">
            {shelves.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {shelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs"
                  >
                    <div>
                      <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <Folder className="size-4" />
                      </span>
                      <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {shelf.name}
                      </h3>
                      {shelf.description && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {shelf.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500">
                      <span>{shelf.book_count} books</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <Folder className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No public shelves
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  This reader has kept their custom shelves private.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Reflections */}
        {activeTab === "reflections" && (
          <div className="space-y-4">
            {reflections.length > 0 ? (
              <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
                {reflections.map((entry) => (
                  <div key={`${entry.source}-${entry.book_id}`} className="p-5 flex gap-4">
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {entry.book?.cover ? (
                        <Image
                          src={entry.book.cover}
                          alt={entry.book.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="size-4 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <Link
                        href={`/book/${entry.source}/${encodeURIComponent(entry.book_id)}`}
                        className="font-serif text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-700"
                      >
                        {entry.book?.title ?? `Book #${entry.book_id}`}
                      </Link>
                      <p className="text-xs text-zinc-500">{entry.book?.author ?? "Unknown"}</p>
                      {entry.rating && (
                        <div className="flex items-center gap-0.5 text-amber-500 py-0.5">
                          {[...Array(entry.rating)].map((_, i) => (
                            <Star key={i} className="size-3 fill-amber-500" />
                          ))}
                        </div>
                      )}
                      {entry.reflection && (
                        <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-serif italic">
                          &ldquo;{entry.reflection}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <MessageSquareQuote className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No public reflections yet
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  This reader has not shared public reviews yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Quotations */}
        {activeTab === "quotes" && (
          <div className="space-y-4">
            {quotes.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 shadow-xs"
                  >
                    <div className="space-y-2">
                      <Quote className="size-5 text-emerald-700 dark:text-emerald-400" />
                      <p className="font-serif italic text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        &ldquo;{quote.text}&rdquo;
                      </p>
                      {quote.note && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Note: {quote.note}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 font-mono">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <Quote className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No public quotations shared
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  This reader has not made any quotations public.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Reading Journey Timeline */}
        {activeTab === "journey" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              Reading Journey
            </h2>
            <ReadingJourneyTimeline events={journey} />
          </div>
        )}
      </main>
    </AppShell>
  );
}
