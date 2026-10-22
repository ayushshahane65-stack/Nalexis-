"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  Folder,
  Globe,
  Heart,
  Lock,
  MessageSquareQuote,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Trophy,
  User,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ReadingJourneyTimeline, { type JourneyEventItem } from "@/components/profile/ReadingJourneyTimeline";
import ShelfCollage from "@/components/library/ShelfCollage";
import { getAllUserBooksAsync } from "@/lib/epub/storage";
import type { ApiBook } from "@/lib/books";

interface ProfileState {
  user_id: string;
  email?: string;
  profile: {
    display_name: string | null;
    username: string | null;
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
    currently_reading: number;
    saved_quotes: number;
  };
}

interface ShelfWithBooks {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_public: boolean;
  is_default: boolean;
  book_count: number;
  books?: Array<{ source: string; book_id: string }>;
  resolvedCovers?: Array<string | null>;
}

interface ReflectionEntry {
  id: string;
  source: string;
  book_id: string;
  status: string;
  rating: number | null;
  reflection: string | null;
  is_reflection_shared: boolean;
  book?: ApiBook;
}

interface QuoteEntry {
  id: string;
  source: string;
  book_id: string;
  text: string;
  note: string | null;
  is_shared: boolean;
  created_at: string;
}

export default function ProfileClient() {
  const [data, setData] = useState<ProfileState | null>(null);
  const [shelves, setShelves] = useState<ShelfWithBooks[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [journeyEvents, setJourneyEvents] = useState<JourneyEventItem[]>([]);
  const [onDeviceCount, setOnDeviceCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewVisitorMode, setPreviewVisitorMode] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setIsUnauthenticated(false);

    try {
      // 1. Fetch profile & stats
      const profileRes = await fetch("/api/profile");
      if (profileRes.status === 401) {
        setIsUnauthenticated(true);
        return;
      }
      if (!profileRes.ok) {
        setHasError(true);
        return;
      }
      const profileData: ProfileState = await profileRes.json();
      setData(profileData);

      // 2. Fetch shelves with books included
      const shelvesRes = await fetch("/api/shelves?includeBooks=true");
      const shelvesData: ShelfWithBooks[] = shelvesRes.ok ? await shelvesRes.json() : [];
      setShelves(shelvesData);

      // 3. Fetch user library books to find reflections
      const libraryRes = await fetch("/api/library");
      if (libraryRes.ok) {
        const libBooks: ReflectionEntry[] = await libraryRes.json();
        const reflected = libBooks.filter((b) => b.reflection || b.rating);

        // Resolve metadata for reflected books
        const resolvedReflected = await Promise.all(
          reflected.map(async (entry) => {
            try {
              const dRes = await fetch(`/api/books/${entry.source}/${encodeURIComponent(entry.book_id)}`);
              if (dRes.ok) {
                return { ...entry, book: await dRes.json() };
              }
            } catch {
              // fallback
            }
            return entry;
          })
        );
        setReflections(resolvedReflected);
      }

      // 4. Fetch quotes
      const quotesRes = await fetch("/api/quotes");
      if (quotesRes.ok) {
        setQuotes(await quotesRes.json());
      }

      // 5. Fetch journey events
      const journeyRes = await fetch("/api/journey?limit=25");
      if (journeyRes.ok) {
        setJourneyEvents(await journeyRes.json());
      }

      // 6. Fetch on-device EPUB count (local only)
      const userEpubs = await getAllUserBooksAsync();
      setOnDeviceCount(userEpubs.length);
    } catch (err) {
      console.error("Profile load failed:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const toggleShareReflection = async (entry: ReflectionEntry) => {
    const nextShared = !entry.is_reflection_shared;
    try {
      const res = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: entry.source,
          book_id: entry.book_id,
          is_reflection_shared: nextShared,
        }),
      });
      if (res.ok) {
        setReflections((prev) =>
          prev.map((r) =>
            r.source === entry.source && r.book_id === entry.book_id
              ? { ...r, is_reflection_shared: nextShared }
              : r
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle reflection share:", err);
    }
  };

  const toggleShareQuote = async (quote: QuoteEntry) => {
    const nextShared = !quote.is_shared;
    try {
      const res = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, is_shared: nextShared }),
      });
      if (res.ok) {
        setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, is_shared: nextShared } : q)));
      }
    } catch (err) {
      console.error("Failed to toggle quote share:", err);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-12 animate-pulse space-y-8">
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

  if (isUnauthenticated) {
    return (
      <AppShell>
        <main className="mx-auto max-w-lg px-4 py-24 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--primary)] dark:bg-emerald-950/40 shadow-xs">
            <Globe className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--text)]">
              Your Living Library
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
              Sign in to curate your public profile, share custom shelves, and track your reflective reading journey.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-medium text-white shadow-xs hover:opacity-95"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Create Account
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  if (hasError || !data) {
    return (
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-20 text-center space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load your profile.</p>
          <button
            onClick={() => void loadProfile()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium"
          >
            <RefreshCw className="size-3.5" />
            <span>Retry</span>
          </button>
        </main>
      </AppShell>
    );
  }

  const { profile, stats } = data;
  const username = profile.username;
  const displayName = profile.display_name || username || "Reader";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Yearly Goal Calculation
  const yearlyGoal = profile.yearly_goal || 12;
  const completedCount = stats.books_completed || 0;
  const goalPercent = Math.min(100, Math.round((completedCount / yearlyGoal) * 100));

  // In visitor preview mode, filter out private items
  const displayShelves = previewVisitorMode ? shelves.filter((s) => s.is_public) : shelves;
  const displayReflections = previewVisitorMode
    ? reflections.filter((r) => r.is_reflection_shared)
    : reflections;
  const displayQuotes = previewVisitorMode ? quotes.filter((q) => q.is_shared) : quotes;

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-10">
        {/* Visitor Preview Mode Banner */}
        {previewVisitorMode && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Eye className="size-4" />
              <span>
                <strong>Visitor Preview Active:</strong> You are seeing your Living Library exactly as visitors see it.
                Private shelves, unshared quotes, and imported EPUBs are hidden.
              </span>
            </div>
            <button
              onClick={() => setPreviewVisitorMode(false)}
              className="font-semibold underline hover:opacity-80"
            >
              Exit Preview
            </button>
          </div>
        )}

        {/* Profile Header */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
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
                  {username && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">@{username}</span>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                    {profile.bio}
                  </p>
                )}

                {/* Favourite Genres & Authors */}
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

            {/* Header Control Actions */}
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setPreviewVisitorMode(!previewVisitorMode)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
                  previewVisitorMode
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-xs"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Eye className="size-3.5" />
                <span>{previewVisitorMode ? "Viewing as Visitor" : "Preview as Visitor"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-medium text-white hover:opacity-90 shadow-xs transition-opacity"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Profile</span>
              </button>
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

        {/* Real Reading Statistics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">Books Completed</p>
            <p className="font-serif text-2xl font-bold text-[var(--text)]">{stats.books_completed}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">Currently Reading</p>
            <p className="font-serif text-2xl font-bold text-[var(--text)]">{stats.currently_reading}</p>
          </div>

          {!previewVisitorMode && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">Imported EPUBs</p>
                <span title="Private to you only">
                  <Lock className="size-3 text-zinc-400" />
                </span>
              </div>
              <p className="font-serif text-2xl font-bold text-[var(--text)]">{onDeviceCount}</p>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-1">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
              {previewVisitorMode ? "Shared Quotes" : "Saved Quotes"}
            </p>
            <p className="font-serif text-2xl font-bold text-[var(--text)]">
              {previewVisitorMode ? displayQuotes.length : stats.saved_quotes}
            </p>
          </div>
        </section>

        {/* Shelves Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Living Library Shelves</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {previewVisitorMode
                  ? "Public shelves shared with the community"
                  : "All your reading shelves. Click any shelf to manage its books."}
              </p>
            </div>
            <Link href="/library" className="text-xs font-medium text-[var(--primary)] hover:underline">
              Manage in My Library &rarr;
            </Link>
          </div>

          {displayShelves.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/50 p-8 text-center dark:bg-zinc-900/30">
              <p className="text-xs text-[var(--text-muted)]">No public shelves available to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayShelves.map((shelf) => (
                <div
                  key={shelf.id}
                  className="group flex items-start gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs hover:shadow-md transition-all"
                >
                  <ShelfCollage
                    customCover={shelf.cover_image}
                    bookCovers={[]}
                    size="sm"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-sm font-bold text-[var(--text)] line-clamp-1">{shelf.name}</h3>
                      {shelf.is_public ? (
                        <span title="Public shelf" className="text-emerald-600 dark:text-emerald-400">
                          <Globe className="size-3" />
                        </span>
                      ) : (
                        <span title="Private shelf" className="text-zinc-400">
                          <Lock className="size-3" />
                        </span>
                      )}
                    </div>
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

        {/* Reflections Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[var(--text)]">Reader Reflections</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {previewVisitorMode
                  ? "Thoughts and ratings shared by this reader"
                  : "Your personal notes and reflections on finished books"}
              </p>
            </div>
          </div>

          {displayReflections.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/50 p-8 text-center dark:bg-zinc-900/30">
              <Sparkles className="size-6 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs text-[var(--text-muted)]">
                {previewVisitorMode
                  ? "No reflections have been shared publicly yet."
                  : "Complete a book and add an optional reflection to see it here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayReflections.map((r) => (
                <div
                  key={`${r.source}:${r.book_id}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-2.5 flex flex-col justify-between"
                >
                  <div>
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

                  {!previewVisitorMode && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => toggleShareReflection(r)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                          r.is_reflection_shared
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <Share2 className="size-3" />
                        <span>{r.is_reflection_shared ? "Shared on profile" : "Keep private"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared Quotes Section */}
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--text)]">Memorable Quotes</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {previewVisitorMode ? "Selected passages shared by the reader" : "Passages you have chosen to preserve"}
            </p>
          </div>

          {displayQuotes.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/50 p-8 text-center dark:bg-zinc-900/30">
              <MessageSquareQuote className="size-6 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs text-[var(--text-muted)]">
                {previewVisitorMode
                  ? "No shared quotes to display."
                  : "Highlight passages while reading to save quotes."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayQuotes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <blockquote className="font-serif italic text-xs leading-relaxed text-[var(--text)]">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>

                  {q.note && <p className="text-[11px] text-[var(--text-muted)]">{q.note}</p>}

                  {!previewVisitorMode && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => toggleShareQuote(q)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors ${
                          q.is_shared
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <Share2 className="size-3" />
                        <span>{q.is_shared ? "Shared on profile" : "Keep private"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reading Journey Section */}
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--text)]">Reading Journey</h2>
            <p className="text-xs text-[var(--text-muted)]">A calm, personal chronicle of your literary exploration</p>
          </div>
          <ReadingJourneyTimeline events={journeyEvents} />
        </section>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <EditProfileModal
            isOpen={true}
            initialProfile={profile}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => void loadProfile()}
          />
        )}
      </main>
    </AppShell>
  );
}
