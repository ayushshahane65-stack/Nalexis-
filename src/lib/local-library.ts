import type { LibraryBookStatus } from "@/lib/supabase/database.types";
import type { ApiBook } from "@/lib/books";

export interface LocalShelf {
  id: string;
  name: string;
  description?: string | null;
  is_public: boolean;
  is_default: boolean;
}

export interface LocalLibraryEntry {
  source: string;
  book_id: string;
  status: LibraryBookStatus;
  progress: number;
  started_at?: string | null;
  finished_at?: string | null;
  rating?: number | null;
  reflection?: string | null;
  is_reflection_shared?: boolean;
  is_favourite?: boolean;
  shelf_ids: string[];
  updated_at: string;
  // Cached metadata
  title?: string;
  author?: string;
  cover?: string | null;
  format?: string;
}

const STORAGE_KEYS = {
  BOOKS: "nalexis_local_library_books",
  SHELVES: "nalexis_local_library_shelves",
};

export const DEFAULT_LOCAL_SHELVES: LocalShelf[] = [
  { id: "shelf-currently-reading", name: "Currently Reading", description: "Books you are actively exploring", is_public: false, is_default: true },
  { id: "shelf-want-to-read", name: "Want to Read", description: "Books queued for future discovery", is_public: false, is_default: true },
  { id: "shelf-finished", name: "Finished Books", description: "Completed titles in your reading journey", is_public: false, is_default: true },
  { id: "shelf-favourites", name: "Favourites", description: "Treasured volumes and personal recommendations", is_public: false, is_default: true },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ── Local Books Operations ───────────────────────────────────────────────────

export function getLocalLibraryBooks(): LocalLibraryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKS);
    if (!raw) return [];
    return JSON.parse(raw) as LocalLibraryEntry[];
  } catch {
    return [];
  }
}

export function saveLocalLibraryBook(
  book: Partial<ApiBook> & { source: string; id: string | number },
  status: LibraryBookStatus = "want_to_read",
  options?: {
    is_favourite?: boolean;
    rating?: number | null;
    reflection?: string | null;
    shelf_ids?: string[];
  }
): LocalLibraryEntry {
  const books = getLocalLibraryBooks();
  const bookIdStr = String(book.id);
  const existingIdx = books.findIndex(
    (b) => b.source === book.source && String(b.book_id) === bookIdStr
  );

  const now = new Date().toISOString();
  const entry: LocalLibraryEntry = {
    source: book.source,
    book_id: bookIdStr,
    status,
    progress: existingIdx >= 0 ? books[existingIdx].progress : 0,
    started_at: status === "currently_reading" ? now : existingIdx >= 0 ? books[existingIdx].started_at : null,
    finished_at: status === "finished" ? now : existingIdx >= 0 ? books[existingIdx].finished_at : null,
    rating: options?.rating !== undefined ? options.rating : existingIdx >= 0 ? books[existingIdx].rating : null,
    reflection: options?.reflection !== undefined ? options.reflection : existingIdx >= 0 ? books[existingIdx].reflection : null,
    is_favourite: options?.is_favourite !== undefined ? options.is_favourite : existingIdx >= 0 ? books[existingIdx].is_favourite : false,
    shelf_ids: options?.shelf_ids !== undefined ? options.shelf_ids : existingIdx >= 0 ? books[existingIdx].shelf_ids : [],
    updated_at: now,
    title: book.title || (existingIdx >= 0 ? books[existingIdx].title : undefined),
    author: book.author || (existingIdx >= 0 ? books[existingIdx].author : undefined),
    cover: book.cover !== undefined ? book.cover : (existingIdx >= 0 ? books[existingIdx].cover : undefined),
    format: book.format || (existingIdx >= 0 ? books[existingIdx].format : undefined),
  };

  if (existingIdx >= 0) {
    books[existingIdx] = entry;
  } else {
    books.unshift(entry);
  }

  if (isBrowser()) {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  return entry;
}

export function updateLocalBookFavourite(source: string, bookId: string, isFav: boolean): void {
  const books = getLocalLibraryBooks();
  const found = books.find((b) => b.source === source && String(b.book_id) === String(bookId));
  if (found) {
    found.is_favourite = isFav;
    found.updated_at = new Date().toISOString();
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    }
  }
}

export function removeLocalLibraryBook(source: string, bookId: string): void {
  const books = getLocalLibraryBooks();
  const filtered = books.filter((b) => !(b.source === source && String(b.book_id) === String(bookId)));
  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(filtered));
  }
}

// ── Local Shelves Operations ─────────────────────────────────────────────────

export function getLocalShelves(): LocalShelf[] {
  if (!isBrowser()) return DEFAULT_LOCAL_SHELVES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHELVES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(DEFAULT_LOCAL_SHELVES));
      return DEFAULT_LOCAL_SHELVES;
    }
    const parsed = JSON.parse(raw) as LocalShelf[];
    if (parsed.length === 0) return DEFAULT_LOCAL_SHELVES;
    return parsed;
  } catch {
    return DEFAULT_LOCAL_SHELVES;
  }
}

export function createLocalShelf(name: string, description?: string | null, isPublic: boolean = false): LocalShelf {
  const shelves = getLocalShelves();
  const newShelf: LocalShelf = {
    id: `shelf-custom-${Date.now()}`,
    name: name.trim(),
    description: description?.trim() || null,
    is_public: isPublic,
    is_default: false,
  };
  shelves.push(newShelf);
  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEYS.SHELVES, JSON.stringify(shelves));
  }
  return newShelf;
}

// ── Local Literary Profile ───────────────────────────────────────────────────

export interface LocalLiteraryProfile {
  id?: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_color: string;
  cover_image: string | null;
  reading_philosophy: string | null;
  literary_interests: string[];
  favourite_genres: string[];
  favourite_authors: string[];
  yearly_goal: number;
  theme_accent: string;
  showcase_currently_reading: boolean;
  showcase_completed: boolean;
  showcase_favourites: boolean;
  showcase_quotes: boolean;
  showcase_journey: boolean;
}

export const DEFAULT_LOCAL_PROFILE: LocalLiteraryProfile = {
  display_name: "Literary Scholar",
  username: "scholar",
  bio: "Curating rare editions, philosophic inquiries, and Victorian masterworks. Always reading two books at once.",
  avatar_url: null,
  avatar_color: "#1e3a2f",
  cover_image: "https://images.unsplash.com/photo-1507842229451-7f01be777a26?auto=format&fit=crop&w=1600&q=80",
  reading_philosophy: "To read is to inhabit forgotten centuries, converse across time, and continually question one's own certainties.",
  literary_interests: ["Existentialism", "Victorian Gothic", "Magical Realism", "Ancient Epics"],
  favourite_genres: ["Classic Literature", "Philosophy", "History", "Essays & Criticism"],
  favourite_authors: ["Virginia Woolf", "Franz Kafka", "Jorge Luis Borges", "Fyodor Dostoevsky"],
  yearly_goal: 24,
  theme_accent: "emerald",
  showcase_currently_reading: true,
  showcase_completed: true,
  showcase_favourites: true,
  showcase_quotes: true,
  showcase_journey: true,
};

const PROFILE_KEY = "nalexis_local_literary_profile";

export function getLocalLiteraryProfile(): LocalLiteraryProfile {
  if (!isBrowser()) return DEFAULT_LOCAL_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_LOCAL_PROFILE));
      return DEFAULT_LOCAL_PROFILE;
    }
    return { ...DEFAULT_LOCAL_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LOCAL_PROFILE;
  }
}

export function saveLocalLiteraryProfile(profile: Partial<LocalLiteraryProfile>): LocalLiteraryProfile {
  const current = getLocalLiteraryProfile();
  const updated = { ...current, ...profile };
  if (isBrowser()) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  }
  return updated;
}
