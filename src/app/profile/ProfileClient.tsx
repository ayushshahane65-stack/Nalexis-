"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Feather,
  Folder,
  Globe,
  Heart,
  Lock,
  MessageSquareQuote,
  Quote,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Trophy,
  User,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import EditProfileModal, { type UserProfileData } from "@/components/profile/EditProfileModal";
import ReadingJourneyTimeline, { type JourneyEventItem } from "@/components/profile/ReadingJourneyTimeline";
import ShelfCollage from "@/components/library/ShelfCollage";
import {
  getLocalLiteraryProfile,
  getLocalLibraryBooks,
  getLocalShelves,
  saveLocalLiteraryProfile,
  type LocalLibraryEntry,
  type LocalShelf,
} from "@/lib/local-library";
import type { ApiBook } from "@/lib/books";

interface ProfileState {
  user_id: string;
  email?: string;
  profile: UserProfileData & {
    id: string;
    goal_year?: number;
  };
  stats: {
    books_completed: number;
    currently_reading: number;
    saved_quotes: number;
    favourite_books: number;
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

interface LibraryBookEntry {
  id: string;
  source: string;
  book_id: string;
  status: "currently_reading" | "finished" | "paused" | "dropped" | "want_to_read";
  progress: number;
  rating: number | null;
  reflection: string | null;
  is_reflection_shared: boolean;
  is_favourite: boolean;
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

const SAMPLE_GUEST_QUOTES: QuoteEntry[] = [
  {
    id: "quote-1",
    source: "gutenberg",
    book_id: "84",
    text: "Beware; for I am fearless, and therefore powerful.",
    note: "Mary Shelley — Frankenstein (Ch. 20)",
    is_shared: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "quote-2",
    source: "gutenberg",
    book_id: "1342",
    text: "I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book!",
    note: "Jane Austen — Pride and Prejudice",
    is_shared: true,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "quote-3",
    source: "openlibrary",
    book_id: "works/OL45804W",
    text: "There is no friend as loyal as a book.",
    note: "Ernest Hemingway",
    is_shared: false,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

const SAMPLE_GUEST_JOURNEY: JourneyEventItem[] = [
  {
    event_type: "finished_book",
    source: "gutenberg",
    book_id: "84",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    metadata: { title: "Frankenstein" },
  },
  {
    event_type: "saved_quote",
    source: "gutenberg",
    book_id: "84",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    metadata: { title: "Saved literary passage from Mary Shelley" },
  },
  {
    event_type: "started_book",
    source: "openlibrary",
    book_id: "works/OL4321141W",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    metadata: { title: "The Secret History" },
  },
  {
    event_type: "reached_goal",
    source: "nalexis",
    book_id: "milestone-1",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    metadata: { title: "Reached 50% of annual literary reading goal" },
  },
];

export default function ProfileClient() {
  const [data, setData] = useState<ProfileState | null>(null);
  const [shelves, setShelves] = useState<ShelfWithBooks[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBookEntry[]>([]);
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [journeyEvents, setJourneyEvents] = useState<JourneyEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"showcase" | "shelves" | "reflections" | "quotes" | "journey">("showcase");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      // 1. Attempt profile & stats from cloud API
      const profileRes = await fetch("/api/profile");

      if (profileRes.status === 401) {
        // Guest / Local Admin Mode: Do not block the user! Load local literary profile
        setIsUnauthenticated(true);
        const localProf = getLocalLiteraryProfile();
        const localBooks = getLocalLibraryBooks();
        const localShelves = getLocalShelves();

        // Convert local books to enriched format
        const localEntries: LibraryBookEntry[] = localBooks.map((b) => ({
          id: `${b.source}-${b.book_id}`,
          source: b.source,
          book_id: b.book_id,
          status: b.status,
          progress: b.progress,
          rating: b.rating ?? null,
          reflection: b.reflection ?? null,
          is_reflection_shared: Boolean(b.is_reflection_shared),
          is_favourite: Boolean(b.is_favourite),
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
        }));

        const localShelfList: ShelfWithBooks[] = localShelves.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
          cover_image: null,
          is_public: s.is_public ?? true,
          is_default: s.is_default,
          book_count: localBooks.filter((b) => b.shelf_ids?.includes(s.id)).length,
        }));

        setData({
          user_id: "local-guest",
          profile: {
            id: "local-guest",
            ...localProf,
          },
          stats: {
            books_completed: localBooks.filter((b) => b.status === "finished").length || 3,
            currently_reading: localBooks.filter((b) => b.status === "currently_reading").length || 2,
            saved_quotes: SAMPLE_GUEST_QUOTES.length,
            favourite_books: localBooks.filter((b) => b.is_favourite).length || 2,
          },
        });

        setLibraryBooks(localEntries);
        setShelves(localShelfList);
        setQuotes(SAMPLE_GUEST_QUOTES);
        setJourneyEvents(SAMPLE_GUEST_JOURNEY);
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

      // 3. Fetch user library books
      const libraryRes = await fetch("/api/library");
      if (libraryRes.ok) {
        const libBooks: LibraryBookEntry[] = await libraryRes.json();

        // Resolve metadata for books in library
        const resolved = await Promise.all(
          libBooks.map(async (entry) => {
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
        setLibraryBooks(resolved);
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
    } catch (err) {
      console.error("Profile load error:", err);
      // Fallback to local profile on error
      const localProf = getLocalLiteraryProfile();
      setData({
        user_id: "local-guest",
        profile: {
          id: "local-guest",
          ...localProf,
        },
        stats: {
          books_completed: 3,
          currently_reading: 2,
          saved_quotes: 3,
          favourite_books: 2,
        },
      });
      setQuotes(SAMPLE_GUEST_QUOTES);
      setJourneyEvents(SAMPLE_GUEST_JOURNEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const copyPublicLink = () => {
    if (!data?.profile?.username) return;
    const url = `${window.location.origin}/u/${data.profile.username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const toggleShareReflection = async (entry: LibraryBookEntry) => {
    const nextShared = !entry.is_reflection_shared;
    setLibraryBooks((prev) =>
      prev.map((r) =>
        r.source === entry.source && r.book_id === entry.book_id
          ? { ...r, is_reflection_shared: nextShared }
          : r
      )
    );

    if (!isUnauthenticated) {
      try {
        await fetch("/api/library", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: entry.source,
            book_id: entry.book_id,
            is_reflection_shared: nextShared,
          }),
        });
      } catch (err) {
        console.error("Failed to toggle reflection share:", err);
      }
    }
  };

  const toggleShareQuote = async (quote: QuoteEntry) => {
    const nextShared = !quote.is_shared;
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, is_shared: nextShared } : q)));

    if (!isUnauthenticated) {
      try {
        await fetch("/api/quotes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: quote.id, is_shared: nextShared }),
        });
      } catch (err) {
        console.error("Failed to toggle quote share:", err);
      }
    }
  };

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

  if (hasError && !data) {
    return (
      <AppShell>
        <main className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Could not load your literary profile.
          </p>
          <button
            onClick={() => void loadProfile()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="size-3.5" /> Try Again
          </button>
        </main>
      </AppShell>
    );
  }

  const profile = data?.profile ?? getLocalLiteraryProfile();
  const stats = data?.stats ?? { books_completed: 3, currently_reading: 2, saved_quotes: 3, favourite_books: 2 };
  const username = profile.username;
  const publicUrl = username ? `/u/${username}` : null;
  const goal = profile.yearly_goal || 12;
  const progressPercent = Math.min(100, Math.round((stats.books_completed / goal) * 100));

  // Filter books for showcases
  const currentlyReading = libraryBooks.filter((b) => b.status === "currently_reading");
  const favourites = libraryBooks.filter((b) => b.is_favourite);
  const completed = libraryBooks.filter((b) => b.status === "finished");
  const reflections = libraryBooks.filter((b) => b.reflection || b.rating);
  const publicShelves = shelves.filter((s) => s.is_public);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Guest / Admin Mode Banner */}
        {isUnauthenticated && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Feather className="size-4 text-emerald-700 dark:text-emerald-400" />
                <span>Guest / Admin Mode • Open Literary Profile</span>
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed max-w-2xl">
                You have full access to explore, test, and edit your literary identity, personal reading philosophy, and showcases. All updates persist on this device.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}

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
                    {username ? `@${username}` : "No username set"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                {publicUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={copyPublicLink}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300/40 bg-black/40 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md hover:bg-black/60 transition-colors shadow-xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="size-3.5 text-emerald-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" /> Copy Link
                        </>
                      )}
                    </button>
                    <Link
                      href={publicUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300/40 bg-black/40 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md hover:bg-black/60 transition-colors shadow-xs"
                    >
                      <Globe className="size-3.5 text-emerald-400" />
                      <span>View Public</span>
                      <ExternalLink className="size-3 text-zinc-400" />
                    </Link>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-300/90 font-medium bg-amber-950/60 border border-amber-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md">
                    Set a username to enable public URL
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                >
                  <Edit3 className="size-3.5" /> Edit Profile
                </button>
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

        {/* Literary Interests & Genres Pills */}
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

        {/* Reading Goal & Literary Statistics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Books Finished</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.books_completed}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Currently Reading</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.currently_reading}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <span className="text-[11px] font-medium text-zinc-500">Favourite Books</span>
            <p className="mt-1 font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.favourite_books}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">Annual Goal</span>
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
              Showcased Reads ({currentlyReading.length + favourites.length + completed.length})
            </button>
            <button
              onClick={() => setActiveTab("shelves")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "shelves"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Public Shelves ({publicShelves.length})
            </button>
            <button
              onClick={() => setActiveTab("reflections")}
              className={`border-b-2 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "reflections"
                  ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Reviews & Reflections ({reflections.length})
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
            {currentlyReading.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-3">
                  <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <BookOpen className="size-4 text-emerald-700 dark:text-emerald-400" />
                    Currently In Progress ({currentlyReading.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {currentlyReading.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs transition-all hover:-translate-y-0.5"
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
            {favourites.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-3">
                  <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Heart className="size-4 text-rose-600" />
                    Favourite Volumes ({favourites.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {favourites.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs transition-all hover:-translate-y-0.5"
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
            {completed.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-3">
                  <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
                    Completed Works ({completed.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {completed.map((entry) => (
                    <article
                      key={`${entry.source}-${entry.book_id}`}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-3 shadow-xs transition-all hover:-translate-y-0.5"
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

            {currentlyReading.length === 0 && favourites.length === 0 && completed.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <BookOpen className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No showcased books yet
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Mark books in your library as favourites, currently reading, or finished to feature them here.
                </p>
                <Link
                  href="/library"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  Go to My Library
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Public Shelves */}
        {activeTab === "shelves" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Public Bookshelves
                </h2>
                <p className="text-xs text-zinc-500">
                  Curated collections visible to visitors on your public profile.
                </p>
              </div>
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Manage in Library
              </Link>
            </div>

            {publicShelves.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {publicShelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-4 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <Folder className="size-4" />
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Public
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {shelf.name}
                      </h3>
                      {shelf.description && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {shelf.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                      <span>{shelf.book_count} books</span>
                      <Link
                        href={`/library?shelf=${shelf.id}`}
                        className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        View shelf &rarr;
                      </Link>
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
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Create custom shelves in your library and set their visibility to public to display them here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Reviews & Reflections */}
        {activeTab === "reflections" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Literary Reflections & Reviews
              </h2>
              <p className="text-xs text-zinc-500">
                Your personal notes and critical reflections on books you have read. Toggle sharing to make them public.
              </p>
            </div>

            {reflections.length > 0 ? (
              <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
                {reflections.map((entry) => (
                  <div key={`${entry.source}-${entry.book_id}`} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
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
                      <div className="space-y-1">
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

                    <button
                      type="button"
                      onClick={() => void toggleShareReflection(entry)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        entry.is_reflection_shared
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {entry.is_reflection_shared ? (
                        <>
                          <Globe className="size-3 text-emerald-600 dark:text-emerald-400" /> Shared Publicly
                        </>
                      ) : (
                        <>
                          <Lock className="size-3 text-zinc-400" /> Private to You
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <MessageSquareQuote className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No reflections written
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Add reflections and ratings to books in your library to chronicle your personal reviews.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Quotations */}
        {activeTab === "quotes" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Saved & Shared Quotations
              </h2>
              <p className="text-xs text-zinc-500">
                Memorable passages and quotes saved from your digital reading.
              </p>
            </div>

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

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleShareQuote(quote)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          quote.is_shared
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {quote.is_shared ? (
                          <>
                            <Globe className="size-3 text-emerald-600" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="size-3 text-zinc-400" /> Private
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
                <Quote className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No quotes saved
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Highlight passages while reading any volume to capture quotations here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Reading Journey Timeline */}
        {activeTab === "journey" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              Reading Journey Timeline
            </h2>
            <ReadingJourneyTimeline events={journeyEvents} />
          </div>
        )}

        {/* Edit Modal */}
        <EditProfileModal
          isOpen={showEditModal}
          initialProfile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            saveLocalLiteraryProfile(updated);
            setData((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...updated } } : prev));
          }}
        />
      </main>
    </AppShell>
  );
}
