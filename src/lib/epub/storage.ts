import localforage from "localforage";
import type {
  ParsedEpub,
  ReaderBookmark,
  ReaderHighlight,
  ReaderProgress,
  ReaderPreferences,
  SavedQuote,
  SavedVocabularyWord,
  WordDefinition,
} from "./types";

// LocalForage IndexedDB stores for private on-device EPUB storage
export const booksStore =
  typeof window !== "undefined"
    ? localforage.createInstance({ name: "nalexis", storeName: "epubs" })
    : null;

export const booksMetaStore =
  typeof window !== "undefined"
    ? localforage.createInstance({ name: "nalexis", storeName: "epubs_meta" })
    : null;

export const progressStore =
  typeof window !== "undefined"
    ? localforage.createInstance({ name: "nalexis", storeName: "progress" })
    : null;

const STORAGE_KEYS = {
  PREFS: "nalexis_reader_preferences",
  PROGRESS: "nalexis_reader_progress",
  BOOKMARKS: "nalexis_reader_bookmarks",
  HIGHLIGHTS: "nalexis_reader_highlights",
  QUOTES: "nalexis_reader_quotes",
  USER_BOOKS: "nalexis_user_epub_books",
  VOCABULARY: "nalexis_reader_vocabulary",
  DICTIONARY_CACHE: "nalexis_dictionary_cache",
};

// ── Storage Availability ─────────────────────────────────────────────────────

/** Returns true if localStorage is available and writable. */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = "__nalexis_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: "normal",
  contentWidth: "md",
  theme: "light",
};

// ── Preferences ──────────────────────────────────────────────────────────────

export function getPreferences(): ReaderPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: ReaderPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
  } catch (err) {
    console.error("Failed saving reader preferences:", err);
  }
}

// ── Reading Progress ─────────────────────────────────────────────────────────

export function getProgress(bookId: string): ReaderProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, ReaderProgress>;
    return all[bookId] ?? null;
  } catch {
    return null;
  }
}

export async function getProgressAsync(bookId: string): Promise<ReaderProgress | null> {
  if (progressStore) {
    try {
      const stored = await progressStore.getItem<ReaderProgress>(bookId);
      if (stored) return stored;
    } catch {
      // fallback
    }
  }
  return getProgress(bookId);
}

export function saveProgress(progress: ReaderProgress): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    const all = raw ? (JSON.parse(raw) as Record<string, ReaderProgress>) : {};
    all[progress.bookId] = progress;
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
  } catch (err) {
    console.error("Failed saving reader progress:", err);
  }
  if (progressStore) {
    void progressStore.setItem(progress.bookId, progress).catch(console.error);
  }
  void updateBookLastOpened(progress.bookId, progress.lastReadAt).catch(() => {});
}

export async function saveProgressAsync(progress: ReaderProgress): Promise<void> {
  saveProgress(progress);
  if (progressStore) {
    await progressStore.setItem(progress.bookId, progress);
  }
}

// ── Bookmarks ────────────────────────────────────────────────────────────────

export function getBookmarks(bookId: string): ReaderBookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!raw) return [];
    const all = JSON.parse(raw) as ReaderBookmark[];
    return all.filter((b) => b.bookId === bookId);
  } catch {
    return [];
  }
}

export function saveBookmark(bookmark: ReaderBookmark): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    const all = raw ? (JSON.parse(raw) as ReaderBookmark[]) : [];
    const filtered = all.filter((b) => b.id !== bookmark.id);
    filtered.unshift(bookmark);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed saving bookmark:", err);
  }
}

export function deleteBookmark(bookmarkId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!raw) return;
    const all = JSON.parse(raw) as ReaderBookmark[];
    const filtered = all.filter((b) => b.id !== bookmarkId);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed deleting bookmark:", err);
  }
}

// ── Highlights ───────────────────────────────────────────────────────────────

export function getHighlights(bookId: string): ReaderHighlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    if (!raw) return [];
    const all = JSON.parse(raw) as ReaderHighlight[];
    return all.filter((h) => h.bookId === bookId);
  } catch {
    return [];
  }
}

export function saveHighlight(highlight: ReaderHighlight): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    const all = raw ? (JSON.parse(raw) as ReaderHighlight[]) : [];
    const filtered = all.filter((h) => h.id !== highlight.id);
    filtered.unshift(highlight);
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed saving highlight:", err);
  }
}

export function deleteHighlight(highlightId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    if (!raw) return;
    const all = JSON.parse(raw) as ReaderHighlight[];
    const filtered = all.filter((h) => h.id !== highlightId);
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed deleting highlight:", err);
  }
}

// ── Books Library Store ──────────────────────────────────────────────────────

export function getAllReaderBooks(): ParsedEpub[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_BOOKS);
    if (!raw) return [];
    const userBooks = JSON.parse(raw) as ParsedEpub[];
    // Strictly return ONLY books uploaded by the user (filter out sample-* entries)
    return userBooks.filter((b) => !b.id.startsWith("sample-"));
  } catch {
    return [];
  }
}

export function getReaderBookById(id: string): ParsedEpub | null {
  const books = getAllReaderBooks();
  return books.find((b) => b.id === id) ?? null;
}

export async function getAllUserBooksAsync(): Promise<ParsedEpub[]> {
  if (booksMetaStore) {
    try {
      const books: ParsedEpub[] = [];
      await booksMetaStore.iterate<ParsedEpub, void>((value) => {
        if (value && !value.id.startsWith("sample-")) {
          books.push(value);
        }
      });
      if (books.length > 0) {
        return books.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      }
    } catch (err) {
      console.warn("Failed retrieving books from IndexedDB meta store:", err);
    }
  }
  return getAllReaderBooks();
}

export async function getUserBookByIdAsync(id: string): Promise<ParsedEpub | null> {
  if (booksStore) {
    try {
      const fullBook = await booksStore.getItem<ParsedEpub>(id);
      if (fullBook) return fullBook;
    } catch (err) {
      console.warn("Failed retrieving full book from IndexedDB store:", err);
    }
  }
  return getReaderBookById(id);
}

export async function saveUserBookAsync(book: ParsedEpub, rawFile?: Blob | ArrayBuffer): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Save full book in IndexedDB
  if (booksStore) {
    await booksStore.setItem(book.id, book);
    if (rawFile) {
      await booksStore.setItem(`${book.id}_file`, rawFile);
    }
  }

  // 2. Save book metadata summary (without massive chapters HTML) in meta store & localStorage
  const metaBook: ParsedEpub = {
    id: book.id,
    metadata: book.metadata,
    chapters: [],
    totalChapters: book.totalChapters,
    fileSize: book.fileSize,
    addedAt: book.addedAt,
    lastOpenedAt: book.lastOpenedAt || new Date().toISOString(),
  };

  if (booksMetaStore) {
    await booksMetaStore.setItem(book.id, metaBook);
  }

  // 3. Fallback sync to localStorage for instant synchronous lookups
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_BOOKS);
    const userBooks = raw ? (JSON.parse(raw) as ParsedEpub[]) : [];
    const filtered = userBooks.filter((b) => b.id !== book.id && !b.id.startsWith("sample-"));
    filtered.unshift(metaBook);
    localStorage.setItem(STORAGE_KEYS.USER_BOOKS, JSON.stringify(filtered));
  } catch (err) {
    console.warn("localStorage quota reached for book list; IndexedDB is intact:", err);
  }
}

export function saveUserBook(book: ParsedEpub): void {
  void saveUserBookAsync(book);
}

export async function deleteUserBookAsync(bookId: string): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Delete from IndexedDB
  if (booksStore) {
    await booksStore.removeItem(bookId).catch(() => {});
    await booksStore.removeItem(`${bookId}_file`).catch(() => {});
  }
  if (booksMetaStore) {
    await booksMetaStore.removeItem(bookId).catch(() => {});
  }
  if (progressStore) {
    await progressStore.removeItem(bookId).catch(() => {});
  }

  // 2. Delete from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_BOOKS);
    if (raw) {
      const userBooks = JSON.parse(raw) as ParsedEpub[];
      const filtered = userBooks.filter((b) => b.id !== bookId && !b.id.startsWith("sample-"));
      localStorage.setItem(STORAGE_KEYS.USER_BOOKS, JSON.stringify(filtered));
    }

    // Delete progress
    const rawProg = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (rawProg) {
      const allProg = JSON.parse(rawProg) as Record<string, ReaderProgress>;
      delete allProg[bookId];
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProg));
    }

    // Delete bookmarks
    const rawBm = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (rawBm) {
      const allBm = JSON.parse(rawBm) as ReaderBookmark[];
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(allBm.filter((b) => b.bookId !== bookId)));
    }

    // Delete highlights
    const rawHl = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    if (rawHl) {
      const allHl = JSON.parse(rawHl) as ReaderHighlight[];
      localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(allHl.filter((h) => h.bookId !== bookId)));
    }

    // Delete quotes
    const rawQt = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (rawQt) {
      const allQt = JSON.parse(rawQt) as SavedQuote[];
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(allQt.filter((q) => q.bookId !== bookId)));
    }
  } catch (err) {
    console.error("Failed deleting user book from storage:", err);
  }
}

export function deleteUserBook(bookId: string): void {
  void deleteUserBookAsync(bookId);
}

export async function updateBookLastOpened(bookId: string, timestamp = new Date().toISOString()): Promise<void> {
  if (booksMetaStore) {
    const meta = await booksMetaStore.getItem<ParsedEpub>(bookId);
    if (meta) {
      meta.lastOpenedAt = timestamp;
      await booksMetaStore.setItem(bookId, meta);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_BOOKS);
      if (raw) {
        const userBooks = JSON.parse(raw) as ParsedEpub[];
        const idx = userBooks.findIndex((b) => b.id === bookId);
        if (idx !== -1) {
          userBooks[idx].lastOpenedAt = timestamp;
          localStorage.setItem(STORAGE_KEYS.USER_BOOKS, JSON.stringify(userBooks));
        }
      }
    } catch {
      // ignore
    }
  }
}

// ── Private Reader Vocabulary Store ──────────────────────────────────────────

export function getSavedVocabulary(bookId?: string): SavedVocabularyWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCABULARY);
    if (!raw) return [];
    const all = JSON.parse(raw) as SavedVocabularyWord[];
    if (bookId) {
      return all.filter((w) => w.bookId === bookId);
    }
    return all;
  } catch {
    return [];
  }
}

export function saveVocabularyWord(entry: SavedVocabularyWord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCABULARY);
    const all = raw ? (JSON.parse(raw) as SavedVocabularyWord[]) : [];
    // Replace if same word exists in the same book, or prepend
    const filtered = all.filter(
      (w) => !(w.word.toLowerCase() === entry.word.toLowerCase() && w.bookId === entry.bookId)
    );
    filtered.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed saving vocabulary word:", err);
  }
}

export function deleteVocabularyWord(wordId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCABULARY);
    if (!raw) return;
    const all = JSON.parse(raw) as SavedVocabularyWord[];
    const filtered = all.filter((w) => w.id !== wordId);
    localStorage.setItem(STORAGE_KEYS.VOCABULARY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed deleting vocabulary word:", err);
  }
}

export function isWordSavedInVocabulary(word: string, bookId?: string): boolean {
  if (typeof window === "undefined" || !word) return false;
  const list = getSavedVocabulary(bookId);
  return list.some((w) => w.word.toLowerCase() === word.trim().toLowerCase());
}

// ── Local Dictionary Cache ───────────────────────────────────────────────────

export function getCachedDefinition(word: string): WordDefinition | null {
  if (typeof window === "undefined" || !word) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DICTIONARY_CACHE);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, WordDefinition>;
    return cache[word.trim().toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export function setCachedDefinition(def: WordDefinition): void {
  if (typeof window === "undefined" || !def?.word) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DICTIONARY_CACHE);
    const cache = raw ? (JSON.parse(raw) as Record<string, WordDefinition>) : {};
    cache[def.word.trim().toLowerCase()] = def;
    localStorage.setItem(STORAGE_KEYS.DICTIONARY_CACHE, JSON.stringify(cache));
  } catch (err) {
    console.error("Failed caching definition:", err);
  }
}

// ── Saved Quotes ─────────────────────────────────────────────────────────────

export function getQuotes(bookId?: string): SavedQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (!raw) return [];
    const all = JSON.parse(raw) as SavedQuote[];
    return bookId ? all.filter((q) => q.bookId === bookId) : all;
  } catch {
    return [];
  }
}

export function saveQuote(quote: SavedQuote): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTES);
    const all = raw ? (JSON.parse(raw) as SavedQuote[]) : [];
    const filtered = all.filter((q) => q.id !== quote.id);
    filtered.unshift(quote);
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed saving quote:", err);
  }
}

export function deleteQuote(quoteId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (!raw) return;
    const all = JSON.parse(raw) as SavedQuote[];
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(all.filter((q) => q.id !== quoteId)));
  } catch (err) {
    console.error("Failed deleting quote:", err);
  }
}

// ── Note Update Helpers ───────────────────────────────────────────────────────

export function updateHighlightNote(highlightId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    if (!raw) return;
    const all = JSON.parse(raw) as ReaderHighlight[];
    const updated = all.map((h) =>
      h.id === highlightId ? { ...h, note: note.trim() || undefined } : h
    );
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed updating highlight note:", err);
  }
}

export function updateBookmarkNote(bookmarkId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!raw) return;
    const all = JSON.parse(raw) as ReaderBookmark[];
    const updated = all.map((b) =>
      b.id === bookmarkId ? { ...b, note: note.trim() || undefined } : b
    );
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed updating bookmark note:", err);
  }
}

export function updateQuoteNote(quoteId: string, note: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (!raw) return;
    const all = JSON.parse(raw) as SavedQuote[];
    const updated = all.map((q) =>
      q.id === quoteId ? { ...q, note: note.trim() || undefined } : q
    );
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed updating quote note:", err);
  }
}


