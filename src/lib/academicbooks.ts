import { withCache } from "@/lib/server-cache";

export type AcademicSource = "oapen" | "doab";

export interface AcademicBook {
  id: string;
  title: string;
  author: string;
  description: string;
  cover: string | null;
  readUrl: string;
  format: "pdf";
  source: AcademicSource;
  access: "free";
  external: true;
  subjects?: string[];
  language?: string;
  year?: number | string;
}

const SOURCES: Record<AcademicSource, string> = {
  oapen: "https://library.oapen.org",
  doab: "https://directory.doabooks.org",
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function parseAtomFeed(xml: string, source: AcademicSource): AcademicBook[] {
  const entries: AcademicBook[] = [];
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/g) || [];

  for (let i = 0; i < entryMatches.length; i++) {
    const entry = entryMatches[i];

    // Title
    const rawTitle = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1];
    const title = rawTitle ? unescapeXml(rawTitle) : "";
    if (!title || title.toLowerCase() === "untitled") continue;

    // Link & Handle ID
    const linkMatch =
      entry.match(/<link[^>]+href="([^"]+)"[^>]*rel="alternate"/i) ||
      entry.match(/<link[^>]+href="([^"]+)"/i) ||
      entry.match(/<id>([^<]+)<\/id>/i);

    const handleUrl = linkMatch?.[1]?.trim() || "";
    if (!handleUrl) continue;

    // Extract handle identifier (e.g., "104120" from ".../20.500.12657/104120")
    const handleParts = handleUrl.split("/").filter(Boolean);
    const identifier = handleParts.at(-1) || String(i + 1);
    const bookId = `${source}-${identifier}`;

    // Author
    const authorMatch = entry.match(/<author[\s\S]*?<name>([\s\S]*?)<\/name>/);
    let author = authorMatch?.[1] ? unescapeXml(authorMatch[1]) : "";
    if (!author || author.trim() === "") {
      author = "Unknown";
    }

    // Description / Summary
    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ||
      entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    let description = summaryMatch?.[1] ? unescapeXml(summaryMatch[1]) : "";
    // Clean up summaries that repeat the title and author at the beginning
    if (description.startsWith(title)) {
      description = description.slice(title.length).trim();
      if (description.startsWith(author)) {
        description = description.slice(author.length).trim();
      }
    }

    // Year / Date
    const dateMatch = entry.match(/<published>([\s\S]*?)<\/published>/) ||
      entry.match(/<dc:date>([\s\S]*?)<\/dc:date>/) ||
      entry.match(/<updated>([\s\S]*?)<\/updated>/);
    let year: number | string | undefined;
    if (dateMatch?.[1]) {
      const matchYear = dateMatch[1].match(/\d{4}/);
      if (matchYear) year = parseInt(matchYear[0], 10);
    }

    // Subjects
    const subjectMatches = entry.match(/<category[^>]+term="([^"]+)"/g) || [];
    const subjects = subjectMatches
      .map((cat) => {
        const m = cat.match(/term="([^"]+)"/);
        return m?.[1] ? unescapeXml(m[1]) : "";
      })
      .filter(Boolean)
      .slice(0, 8);

    entries.push({
      id: bookId,
      title,
      author,
      description,
      cover: null,
      readUrl: handleUrl,
      format: "pdf",
      source,
      access: "free",
      external: true,
      subjects: subjects.length > 0 ? subjects : undefined,
      language: "EN",
      year,
    });
  }

  return entries;
}

async function fetchOpenSearch(source: AcademicSource, query: string): Promise<AcademicBook[]> {
  const cacheKey = `academic_${source}_${query.toLowerCase().trim()}`;

  return withCache(cacheKey, 10 * 60 * 1000, async () => {
    const searchUrl = `${SOURCES[source]}/open-search/?query=${encodeURIComponent(query)}&format=atom`;

    try {
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/atom+xml,application/xml,text/xml",
        },
        next: { revalidate: 600 },
      });

      if (!response.ok) {
        console.warn(`[Academic Books] ${source.toUpperCase()} OpenSearch HTTP ${response.status} for query "${query}"`);
        return [];
      }

      const xml = await response.text();
      return parseAtomFeed(xml, source);
    } catch (error) {
      console.error(`[Academic Books] ${source.toUpperCase()} search request failed for query "${query}":`, error);
      return [];
    }
  });
}

export function searchOapen(query: string): Promise<AcademicBook[]> {
  return fetchOpenSearch("oapen", query);
}

export function searchDoab(query: string): Promise<AcademicBook[]> {
  return fetchOpenSearch("doab", query);
}

export function browseOapen(category: string, page = 1): Promise<AcademicBook[]> {
  const q = category === "textbooks & academic" ? "academic research" : category;
  return fetchOpenSearch("oapen", q);
}

export function browseDoab(category: string, page = 1): Promise<AcademicBook[]> {
  const q = category === "textbooks & academic" ? "open access peer reviewed" : category;
  return fetchOpenSearch("doab", q);
}

export async function getAcademicBook(
  source: AcademicSource,
  id: string,
): Promise<AcademicBook | null> {
  const prefix = `${source}-`;
  const cleanId = id.startsWith(prefix) ? id.slice(prefix.length) : id;

  // Search by identifier
  const books = await fetchOpenSearch(source, cleanId);

  // Look for match
  const found = books.find((b) => {
    const rawId = b.id.replace(new RegExp(`^${source}-`), "");
    return rawId === cleanId || b.id === id || b.readUrl.includes(cleanId);
  });

  if (found) return found;

  // Fallback: If not found in first search, attempt a direct search with query
  if (books.length > 0) return books[0];

  return null;
}
