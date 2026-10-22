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
 * Returns up to 32 results (one page from the Gutendex API).
 */
export async function searchGutendex(q: string): Promise<GutenbergBook[]> {
  const url = `${BASE}/books/?search=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Gutendex search failed: ${res.status}`);
  const data: GutendexResponse = await res.json();
  return data.results.map(formatBook);
}

/**
 * Browse Gutenberg books by category (topic filter).
 * Only returns books with a readable HTML or EPUB format.
 */
export async function browseGutendex(
  category: string,
  page: number,
): Promise<GutenbergBook[]> {
  // "popular" = no topic filter, just sorted by downloads
  const topicParam = category === "popular" ? "" : `&topic=${encodeURIComponent(category)}`;
  const url = `${BASE}/books/?languages=en${topicParam}&page=${page}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Gutendex browse failed: ${res.status}`);
  const data: GutendexResponse = await res.json();

  // Keep only Text books with at least one readable format
  return data.results
    .filter((b) => {
      const hasReadable =
        "text/html" in b.formats ||
        "text/html; charset=utf-8" in b.formats ||
        "application/epub+zip" in b.formats;
      return hasReadable;
    })
    .map(formatBook);
}

/**
 * Fetch a single book by its numeric Gutenberg ID.
 */
export async function getGutendexBook(id: number): Promise<GutenbergBook> {
  const res = await fetch(`${BASE}/books/${id}/`, {
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Book not found: ${id}`);
  const data: GutendexBook = await res.json();
  return formatBook(data);
}
