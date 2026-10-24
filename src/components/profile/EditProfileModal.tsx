"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Feather,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Palette,
  Plus,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { saveLocalLiteraryProfile } from "@/lib/local-library";

export interface UserProfileData {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_color: string;
  cover_image?: string | null;
  reading_philosophy?: string | null;
  literary_interests?: string[];
  favourite_genres: string[];
  favourite_authors: string[];
  yearly_goal: number;
  theme_accent?: string;
  showcase_currently_reading?: boolean;
  showcase_completed?: boolean;
  showcase_favourites?: boolean;
  showcase_quotes?: boolean;
  showcase_journey?: boolean;
  featured_book_source?: string | null;
  featured_book_id?: string | null;
  featured_book_title?: string | null;
  featured_book_author?: string | null;
  featured_book_cover?: string | null;
  featured_shelf_id?: string | null;
}

interface EditProfileModalProps {
  isOpen: boolean;
  initialProfile: UserProfileData;
  onClose: () => void;
  onSuccess: (updated: UserProfileData) => void;
}

const COMMON_GENRES = [
  "Classic Literature",
  "Philosophy",
  "Poetry",
  "History",
  "Science Fiction",
  "Essays & Criticism",
  "Memoir",
  "Psychology",
  "Drama",
  "Mythology",
];

const COMMON_INTERESTS = [
  "Existentialism",
  "Magical Realism",
  "Victorian Gothic",
  "Epistolary Novels",
  "Ancient Epics",
  "Postmodernism",
  "Transcendentalism",
  "Russian Realism",
  "Modernist Streams",
  "Satire",
];

const COVER_PRESETS = [
  {
    name: "Dark Academia Library",
    url: "https://images.unsplash.com/photo-1507842229451-7f01be777a26?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Antique Leather & Parchment",
    url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Classic Reader's Desk",
    url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    name: "Quiet Library Alcove",
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80",
  },
];

const THEME_ACCENTS = [
  { id: "emerald", label: "Emerald Green", class: "bg-emerald-600" },
  { id: "amber", label: "Warm Amber", class: "bg-amber-600" },
  { id: "rose", label: "Vintage Rose", class: "bg-rose-600" },
  { id: "indigo", label: "Midnight Indigo", class: "bg-indigo-600" },
  { id: "slate", label: "Classic Slate", class: "bg-slate-700" },
];

export default function EditProfileModal({
  isOpen,
  initialProfile,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"identity" | "literary" | "privacy">("identity");

  // Basic Profile
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");
  const [avatarColor, setAvatarColor] = useState(initialProfile.avatar_color ?? "#3F5F52");
  const [coverImage, setCoverImage] = useState(initialProfile.cover_image ?? "");

  // Literary Identity
  const [readingPhilosophy, setReadingPhilosophy] = useState(initialProfile.reading_philosophy ?? "");
  const [literaryInterests, setLiteraryInterests] = useState<string[]>(initialProfile.literary_interests ?? []);
  const [interestInput, setInterestInput] = useState("");
  const [genres, setGenres] = useState<string[]>(initialProfile.favourite_genres ?? []);
  const [genreInput, setGenreInput] = useState("");
  const [authors, setAuthors] = useState<string[]>(initialProfile.favourite_authors ?? []);
  const [authorInput, setAuthorInput] = useState("");
  const [yearlyGoal, setYearlyGoal] = useState<number>(initialProfile.yearly_goal ?? 12);
  const [themeAccent, setThemeAccent] = useState(initialProfile.theme_accent ?? "emerald");

  // Privacy & Showcase Toggles
  const [showcaseReading, setShowcaseReading] = useState(initialProfile.showcase_currently_reading ?? true);
  const [showcaseCompleted, setShowcaseCompleted] = useState(initialProfile.showcase_completed ?? true);
  const [showcaseFavourites, setShowcaseFavourites] = useState(initialProfile.showcase_favourites ?? true);
  const [showcaseQuotes, setShowcaseQuotes] = useState(initialProfile.showcase_quotes ?? true);
  const [showcaseJourney, setShowcaseJourney] = useState(initialProfile.showcase_journey ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialProfile.display_name ?? "");
      setUsername(initialProfile.username ?? "");
      setBio(initialProfile.bio ?? "");
      setAvatarUrl(initialProfile.avatar_url ?? "");
      setAvatarColor(initialProfile.avatar_color ?? "#3F5F52");
      setCoverImage(initialProfile.cover_image ?? "");
      setReadingPhilosophy(initialProfile.reading_philosophy ?? "");
      setLiteraryInterests(initialProfile.literary_interests ?? []);
      setGenres(initialProfile.favourite_genres ?? []);
      setAuthors(initialProfile.favourite_authors ?? []);
      setYearlyGoal(initialProfile.yearly_goal ?? 12);
      setThemeAccent(initialProfile.theme_accent ?? "emerald");
      setShowcaseReading(initialProfile.showcase_currently_reading ?? true);
      setShowcaseCompleted(initialProfile.showcase_completed ?? true);
      setShowcaseFavourites(initialProfile.showcase_favourites ?? true);
      setShowcaseQuotes(initialProfile.showcase_quotes ?? true);
      setShowcaseJourney(initialProfile.showcase_journey ?? true);
      setError(null);
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const addInterest = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !literaryInterests.includes(trimmed)) {
      setLiteraryInterests([...literaryInterests, trimmed]);
      setInterestInput("");
    }
  };

  const removeInterest = (item: string) => {
    setLiteraryInterests(literaryInterests.filter((i) => i !== item));
  };

  const addGenre = (g: string) => {
    const trimmed = g.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setGenreInput("");
    }
  };

  const removeGenre = (g: string) => {
    setGenres(genres.filter((item) => item !== g));
  };

  const addAuthor = (a: string) => {
    const trimmed = a.trim();
    if (trimmed && !authors.includes(trimmed)) {
      setAuthors([...authors, trimmed]);
      setAuthorInput("");
    }
  };

  const removeAuthor = (a: string) => {
    setAuthors(authors.filter((item) => item !== a));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Clean username validation
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername && !/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
      setError("Username must be 3-30 letters, numbers, hyphens, or underscores.");
      setIsSaving(false);
      return;
    }

    const payload = {
      display_name: displayName.trim() || null,
      username: cleanUsername || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      avatar_color: avatarColor,
      cover_image: coverImage.trim() || null,
      reading_philosophy: readingPhilosophy.trim() || null,
      literary_interests: literaryInterests,
      favourite_genres: genres,
      favourite_authors: authors,
      yearly_goal: Number(yearlyGoal) || 12,
      theme_accent: themeAccent,
      showcase_currently_reading: showcaseReading,
      showcase_completed: showcaseCompleted,
      showcase_favourites: showcaseFavourites,
      showcase_quotes: showcaseQuotes,
      showcase_journey: showcaseJourney,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // Guest / Local Admin Mode: persist to localStorage
        saveLocalLiteraryProfile(payload);
        onSuccess({
          ...initialProfile,
          ...payload,
        });
        onClose();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      // Also persist to localStorage for offline resilience
      saveLocalLiteraryProfile(payload);

      onSuccess({
        ...initialProfile,
        ...payload,
      });
      onClose();
    } catch (err: unknown) {
      // If offline / network error, still save locally
      saveLocalLiteraryProfile(payload);
      onSuccess({
        ...initialProfile,
        ...payload,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Feather className="size-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Edit Literary Profile
              </h2>
              <p className="text-xs text-zinc-500">
                Shape your literary identity, showcase preferences, and reading philosophy.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/50 px-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "identity"
                ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Reader Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("literary")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "literary"
                ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Interests & Philosophy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "privacy"
                ? "border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Showcase & Privacy
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* TAB 1: Reader Identity */}
          {activeTab === "identity" && (
            <div className="space-y-5">
              {/* Cover Banner Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Profile Cover Banner
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Select a classic literary preset or paste an image URL.
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COVER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCoverImage(preset.url)}
                      className={`group relative h-16 overflow-hidden rounded-xl border text-left transition-all ${
                        coverImage === preset.url
                          ? "ring-2 ring-emerald-600 border-transparent shadow-sm"
                          : "border-zinc-200 dark:border-zinc-800 hover:opacity-90"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 p-1 flex items-end">
                        <span className="text-[10px] font-medium text-white truncate">
                          {preset.name}
                        </span>
                      </div>
                      {coverImage === preset.url && (
                        <div className="absolute top-1 right-1 rounded-full bg-emerald-600 p-0.5 text-white">
                          <Check className="size-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5">
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="Or enter custom banner image URL (https://...)"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Display Name & Username */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Unique Username
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs text-zinc-400">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-7 pr-3.5 py-2.5 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Public URL: /u/{username || "username"}
                  </p>
                </div>
              </div>

              {/* Avatar URL & Initial Palette */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Fallback Avatar Color
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={avatarColor}
                      onChange={(e) => setAvatarColor(e.target.value)}
                      className="size-9 cursor-pointer rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <span className="text-xs font-mono text-zinc-500 uppercase">{avatarColor}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Literary Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short note about your reading tastes, favourite eras, or current literary obsessions..."
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Theme Accent */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Profile Palette Accent
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {THEME_ACCENTS.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => setThemeAccent(accent.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        themeAccent === accent.id
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}
                    >
                      <span className={`size-2.5 rounded-full ${accent.class}`} />
                      <span>{accent.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Literary Interests & Philosophy */}
          {activeTab === "literary" && (
            <div className="space-y-6">
              {/* Personal Reading Philosophy */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Personal Reading Philosophy
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  A personal motto, guiding perspective, or quotation on what reading means to you.
                </p>
                <div className="relative mt-2">
                  <textarea
                    rows={3}
                    value={readingPhilosophy}
                    onChange={(e) => setReadingPhilosophy(e.target.value)}
                    placeholder='e.g. "I read not to escape reality, but to equip myself to bear it and re-imagine it."'
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 font-serif italic text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Literary Interests (Movements, Themes) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Literary Interests & Movements
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Themes, literary periods, or stylistic currents that captivate your mind.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {literaryInterests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest(interestInput);
                      }
                    }}
                    placeholder="Add an interest (e.g. Magic Realism, Victorian Gothic)..."
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => addInterest(interestInput)}
                    className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
                {/* Popular Interest Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {COMMON_INTERESTS.filter((i) => !literaryInterests.includes(i))
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => addInterest(item)}
                        className="rounded-md border border-dashed border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        + {item}
                      </button>
                    ))}
                </div>
              </div>

              {/* Favourite Genres */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Favourite Genres
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {g}
                      <button
                        type="button"
                        onClick={() => removeGenre(g)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGenre(genreInput);
                      }
                    }}
                    placeholder="Add a genre..."
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => addGenre(genreInput)}
                    className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {COMMON_GENRES.filter((g) => !genres.includes(g))
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => addGenre(item)}
                        className="rounded-md border border-dashed border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        + {item}
                      </button>
                    ))}
                </div>
              </div>

              {/* Favourite Authors */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Favourite Authors
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {authors.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => removeAuthor(a)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAuthor(authorInput);
                      }
                    }}
                    placeholder="Add an author (e.g. Virginia Woolf, Franz Kafka)..."
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => addAuthor(authorInput)}
                    className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Annual Reading Goal */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Annual Reading Goal ({new Date().getFullYear()})
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={yearlyGoal}
                    onChange={(e) => setYearlyGoal(Number(e.target.value))}
                    className="w-24 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs text-zinc-500">books per year</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Showcase & Privacy */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-emerald-700 dark:text-emerald-400" />
                  <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    Strict Privacy Protection
                  </h3>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80 dark:text-emerald-400/80">
                  Your private library notes, personal reading annotations, and private custom shelves are NEVER visible to the public. You have granular control over which sections appear on your public profile.
                </p>
              </div>

              <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {/* Favourites */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Showcase Favourite Books
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Display books you’ve marked with a heart on your public profile.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showcaseFavourites}
                    onChange={(e) => setShowcaseFavourites(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Currently Reading */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Showcase Currently Reading
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Display your active reads and progress on your profile.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showcaseReading}
                    onChange={(e) => setShowcaseReading(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Completed Books */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Showcase Finished Books
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Display books you’ve completed and your reading achievements.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showcaseCompleted}
                    onChange={(e) => setShowcaseCompleted(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Shareable Quotes */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Showcase Shareable Quotations
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Display quotes you have explicitly opted to make public.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showcaseQuotes}
                    onChange={(e) => setShowcaseQuotes(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                {/* Reading Journey Timeline */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Showcase Reading Journey Timeline
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Display public milestones (books finished, goals reached) on your profile.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showcaseJourney}
                    onChange={(e) => setShowcaseJourney(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
