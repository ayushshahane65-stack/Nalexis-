// ─── Types ───────────────────────────────────────────────────────────────────

/** Access level reported by Open Library. */
export type OLAccess = "public" | "borrowable" | "no_ebook";

/** Normalised shape — matches GutenbergBook so the rest of the app is source-agnostic. */
export interface OpenLibraryBook {
  id: string;            // e.g. "/works/OL12345W"
  title: string;
  author: string;
  cover: string | null;
  readUrl: string | null;   // embed URL for public books; null otherwise
  epubUrl: null;            // OL doesn't surface direct EPUB links
  downloads: number;        // always 0 — OL doesn't expose download counts
  source: "openlibrary";
  access: OLAccess;
  description: string;
  format?: "pdf";
  external?: true;
  subjects?: string[];
  language?: string;
  year?: number | string;
}

/** Raw doc shape from /search.json */
interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ebook_access?: string;
  ia?: string[];
  has_fulltext?: boolean;
  subject?: string[];
  language?: string[];
}

interface OLResponse {
  docs: OLDoc[];
}

interface OLWorkResponse {
  key: string;
  title: string;
  description?: string | { value: string };
  covers?: number[];
  authors?: Array<{ author?: { key?: string } }>;
  subjects?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org/b/id";

// OL asks polite apps to identify themselves via User-Agent
const UA = "Nalexis (nalexis-app@example.com)";

function mapAccess(raw: string | undefined): OLAccess {
  if (raw === "public") return "public";
  if (raw === "borrowable") return "borrowable";
  return "no_ebook";
}

function formatDoc(doc: OLDoc): OpenLibraryBook {
  const access = mapAccess(doc.ebook_access);
  const ia0 = doc.ia?.[0];

  // public   -> embeddable read URL (https://archive.org/embed/{ia})
  // borrowable -> IA detail page (https://archive.org/details/{ia})
  // no_ebook -> null (metadata only)
  const readUrl =
    access === "public" && ia0
      ? `https://archive.org/embed/${ia0}`
      : access === "borrowable" && ia0
      ? `https://archive.org/details/${ia0}`
      : null;

  return {
    id: doc.key,
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    cover: doc.cover_i != null ? `${COVERS}/${doc.cover_i}-M.jpg` : null,
    readUrl,
    epubUrl: null,
    downloads: 0,
    source: "openlibrary",
    access,
    description: "",
    subjects: doc.subject?.slice(0, 8) ?? [],
    language: doc.language?.[0]?.toUpperCase() ?? "EN",
    year: doc.first_publish_year,
  };
}

export async function getOpenLibraryBook(id: string): Promise<OpenLibraryBook> {
  const workId = id.replace(/^\/?works\//, "");
  const [response, searchResponse] = await Promise.all([
    fetch(`${BASE}/works/${encodeURIComponent(workId)}.json`, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    }),
    fetch(
      `${BASE}/search.json?q=${encodeURIComponent(`/works/${workId}`)}&limit=50&fields=key,title,author_name,cover_i,ebook_access,ia,first_publish_year,subject,language`,
      {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": UA },
        next: { revalidate: 3600 },
      },
    ),
  ]);
  if (!response.ok) throw new Error(`Open Library book failed: ${response.status}`);
  if (!searchResponse.ok) throw new Error(`Open Library access lookup failed: ${searchResponse.status}`);
  const work: OLWorkResponse = await response.json();
  const searchData: OLResponse = await searchResponse.json();
  const doc = searchData.docs.find((entry) => entry.key === `/works/${workId}`);
  const mapped = doc ? formatDoc(doc) : null;

  const authorKey = work.authors?.[0]?.author?.key;
  let author = mapped?.author ?? "Unknown";
  if (authorKey) {
    const authorResponse = await fetch(`${BASE}${authorKey}.json`, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (authorResponse.ok) {
      const authorData: { name?: string } = await authorResponse.json();
      author = authorData.name ?? author;
    }
  }

  const description =
    typeof work.description === "string" ? work.description : work.description?.value ?? "";
  const coverId = work.covers?.find((cover) => cover > 0);

  return {
    id: work.key ?? `/works/${workId}`,
    title: work.title,
    author,
    cover: coverId ? `${COVERS}/${coverId}-M.jpg` : mapped?.cover ?? null,
    readUrl: (mapped?.access === "public" || mapped?.access === "borrowable") ? mapped?.readUrl ?? null : null,
    epubUrl: null,
    downloads: 0,
    source: "openlibrary",
    access: mapped?.access ?? "no_ebook",
    description,
    subjects: work.subjects?.slice(0, 10) ?? mapped?.subjects ?? [],
    language: mapped?.language ?? "EN",
    year: mapped?.year,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search Open Library books by free-text query.
 * Returns up to 20 results. Only called server-side (route handler).
 */
export async function searchOpenLibrary(q: string): Promise<OpenLibraryBook[]> {
  const url =
    `${BASE}/search.json?q=${encodeURIComponent(q)}` +
    `&limit=20&fields=key,title,author_name,cover_i,first_publish_year,ebook_access,ia,has_fulltext`;

  const res = await fetch(url, {
    // 12-second timeout
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": UA },
    next: { revalidate: 300 }, // same 5-min cache as Gutendex
  });

  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);
  const data: OLResponse = await res.json();
  return data.docs.map(formatDoc);
}

/**
 * Browse Open Library by subject/category.
 * Returns readable books that have an Internet Archive id.
 */
export async function browseOpenLibrary(
  category: string,
  page: number,
): Promise<OpenLibraryBook[]> {
  // "popular" uses a broad fiction query so we always get results
  const q = category === "popular"
    ? "fiction"
    : category === "textbooks & academic"
      ? "textbooks"
      : `subject:${category}`;
  const url =
    `${BASE}/search.json?q=${encodeURIComponent(q)}` +
    `&has_fulltext=true&limit=20&page=${page}` +
    `&fields=key,title,author_name,cover_i,first_publish_year,ebook_access,ia,has_fulltext`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": UA },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Open Library browse failed: ${res.status}`);
  const data: OLResponse = await res.json();

  // Keep only books that have an IA id and public/borrowable access
  return data.docs
    .filter((d) => (d.ebook_access === "public" || d.ebook_access === "borrowable") && d.ia && d.ia.length > 0)
    .map(formatDoc);
}
