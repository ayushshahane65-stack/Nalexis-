import { withCache } from "@/lib/server-cache";

// ─── Types ───────────────────────────────────────────────────────────────────

/** The normalised shape we expose to the rest of the app. */
export interface GutenbergBook {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  readUrl: string | null;
  description: string;
  epubUrl: string | null;
  downloads: number;
  source: "gutenberg";
  access: "public"; // Gutendex books are always freely readable
  subjects?: string[];
  language?: string;
  year?: number | string;
}

/** Raw shape returned by the Gutendex API. */
interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year: number | null; death_year: number | null }>;
  formats: Record<string, string>;
  download_count: number;
  description?: string;
  summaries?: string[];
  subjects?: string[];
  languages?: string[];
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function formatBook(b: GutendexBook): GutenbergBook {
  const readUrl = Object.entries(b.formats).find(
    ([format, url]) => format.toLowerCase().startsWith("text/html") && Boolean(url),
  )?.[1] ?? null;

  const desc = b.description || b.summaries?.[0] || "";

  return {
    id: b.id,
    title: b.title,
    author: b.authors[0]?.name ?? "Unknown",
    cover: b.formats["image/jpeg"] ?? null,
    readUrl,
    description: desc,
    epubUrl: b.formats["application/epub+zip"] ?? null,
    downloads: b.download_count,
    source: "gutenberg",
    access: "public",
    subjects: b.subjects?.slice(0, 10) ?? [],
    language: b.languages?.[0]?.toUpperCase() ?? "EN",
    year: b.authors[0]?.death_year ? `Pre-${b.authors[0].death_year}` : undefined,
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const BASE = "https://gutendex.com";

/**
 * Search Project Gutenberg books by free-text query.
 * Cached for 10 minutes; 25-second timeout to handle slow Gutendex upstream.
 */
export async function searchGutendex(q: string): Promise<GutenbergBook[]> {
  const cacheKey = `gutendex_search_${q.toLowerCase().trim()}`;

  return withCache(cacheKey, 10 * 60 * 1000, async () => {
    const url = `${BASE}/books/?search=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
        next: { revalidate: 600 },
      });
      if (!res.ok) {
        console.warn(`[Gutendex] Search HTTP ${res.status} for query "${q}"`);
        return [];
      }
      const data: GutendexResponse = await res.json();
      return Array.isArray(data.results) ? data.results.map(formatBook) : [];
    } catch (error) {
      console.warn(`[Gutendex] Search request failed/timed out for query "${q}":`, error instanceof Error ? error.message : error);
      return [];
    }
  });
}

/**
 * Browse Gutenberg books by category (topic filter).
 * Only returns books with a readable HTML or EPUB format.
 */
export async function browseGutendex(
  category: string,
  page: number,
): Promise<GutenbergBook[]> {
  const cacheKey = `gutendex_browse_${category.toLowerCase().trim()}_p${page}`;

  return withCache(cacheKey, 10 * 60 * 1000, async () => {
    // "popular" = no topic filter, just sorted by downloads
    const topicParam = category === "popular" ? "" : `&topic=${encodeURIComponent(category)}`;
    const url = `${BASE}/books/?languages=en${topicParam}&page=${page}`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
        next: { revalidate: 600 },
      });
      if (!res.ok) {
        console.warn(`[Gutendex] Browse HTTP ${res.status} for category "${category}"`);
        return [];
      }
      const data: GutendexResponse = await res.json();

      if (!Array.isArray(data.results)) return [];

      return data.results
        .filter((b) => {
          const hasReadable =
            "text/html" in b.formats ||
            "text/html; charset=utf-8" in b.formats ||
            "application/epub+zip" in b.formats;
          return hasReadable;
        })
        .map(formatBook);
    } catch (error) {
      console.warn(`[Gutendex] Browse request failed/timed out for category "${category}":`, error instanceof Error ? error.message : error);
      return [];
    }
  });
}

/**
 * Fetch a single book by its numeric Gutenberg ID.
 */
export async function getGutendexBook(id: number): Promise<GutenbergBook> {
  const cacheKey = `gutendex_book_${id}`;

  return withCache(cacheKey, 60 * 60 * 1000, async () => {
    const res = await fetch(`${BASE}/books/${id}/`, {
      signal: AbortSignal.timeout(25000),
      headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Book not found: ${id}`);
    const data: GutendexBook = await res.json();
    return formatBook(data);
  });
}
