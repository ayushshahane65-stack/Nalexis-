"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, User, X, Check } from "lucide-react";

interface UserProfileData {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_color: string;
  favourite_genres: string[];
  favourite_authors: string[];
  yearly_goal: number;
}

interface EditProfileModalProps {
  isOpen: boolean;
  initialProfile: UserProfileData;
  onClose: () => void;
  onSuccess: (updated: UserProfileData) => void;
}

const COMMON_GENRES = [
  "Philosophy",
  "Classic Literature",
  "Poetry",
  "History",
  "Science Fiction",
  "Essays",
  "Memoir",
  "Psychology",
  "Art & Architecture",
  "Mythology",
];

export default function EditProfileModal({
  isOpen,
  initialProfile,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url ?? "");
  const [avatarColor, setAvatarColor] = useState(initialProfile.avatar_color ?? "#3F5F52");
  const [genres, setGenres] = useState<string[]>(initialProfile.favourite_genres ?? []);
  const [genreInput, setGenreInput] = useState("");
  const [authors, setAuthors] = useState<string[]>(initialProfile.favourite_authors ?? []);
  const [authorInput, setAuthorInput] = useState("");
  const [yearlyGoal, setYearlyGoal] = useState<number>(initialProfile.yearly_goal ?? 12);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialProfile.display_name ?? "");
      setUsername(initialProfile.username ?? "");
      setBio(initialProfile.bio ?? "");
      setAvatarUrl(initialProfile.avatar_url ?? "");
      setAvatarColor(initialProfile.avatar_color ?? "#3F5F52");
      setGenres(initialProfile.favourite_genres ?? []);
      setAuthors(initialProfile.favourite_authors ?? []);
      setYearlyGoal(initialProfile.yearly_goal ?? 12);
      setError(null);
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

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

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          username: username.trim().toLowerCase() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          avatar_color: avatarColor,
          favourite_genres: genres,
          favourite_authors: authors,
          yearly_goal: Math.max(1, Number(yearlyGoal) || 12),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }

      const updated = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-[var(--primary)] dark:bg-emerald-950/60">
              <User className="size-4.5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[var(--text)]">Edit Profile</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Control how your Living Library appears to others</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Display Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alexis Vance"
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Username (for public URL)</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-7 pr-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Your public URL: /u/{username || "..."}</p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Short Bio / Reader Reflection</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few words on what reading means to you, your literary world..."
              rows={3}
              maxLength={280}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10px] text-right text-[var(--text-muted)] mt-0.5">{bio.length} / 280</p>
          </div>

          {/* Avatar URL & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Avatar Image URL (Optional)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Fallback Avatar Color</label>
              <div className="flex items-center gap-2 mt-1.5">
                {["#3F5F52", "#2E4057", "#6B4E71", "#7A5C58", "#386641", "#8D5B4C"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    style={{ backgroundColor: color }}
                    className={`size-6 rounded-full border-2 transition-transform ${
                      avatarColor === color ? "scale-115 border-white shadow-xs" : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Yearly Reading Goal */}
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">
              Yearly Reading Goal ({new Date().getFullYear()})
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={yearlyGoal}
              onChange={(e) => setYearlyGoal(Number(e.target.value))}
              className="mt-1.5 w-32 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
            />
            <span className="text-xs text-[var(--text-muted)] ml-2">books this year</span>
          </div>

          {/* Favourite Genres */}
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Favourite Genres</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                >
                  <span>{g}</span>
                  <button type="button" onClick={() => removeGenre(g)} className="hover:text-red-600">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
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
                placeholder="Add genre and press Enter..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => addGenre(genreInput)}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Add
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {COMMON_GENRES.filter((g) => !genres.includes(g)).slice(0, 5).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => addGenre(g)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
                >
                  +{g}
                </button>
              ))}
            </div>
          </div>

          {/* Favourite Authors */}
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Favourite Authors</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {authors.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <span>{a}</span>
                  <button type="button" onClick={() => removeAuthor(a)} className="hover:text-red-600">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
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
                placeholder="Add author and press Enter..."
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--text)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => addAuthor(authorInput)}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Add
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 shadow-xs"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
