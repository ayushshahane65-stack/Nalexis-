export type AcademicSource = "oapen" | "doab";

export interface AcademicBook {
  id: string;
  title: string;
  author: string;
  description: string;
  cover: null;
  readUrl: string;
  format: "pdf";
  source: AcademicSource;
  access: "free";
  external?: true;
  subjects?: string[];
  language?: string;
  year?: number | string;
}

interface DSpaceMetadata {
  key?: string;
  value?: string;
}

interface DSpaceBitstream {
  mimeType?: string;
  retrieveLink?: string;
}

interface DSpaceItem {
  uuid?: string;
  handle?: string;
  id?: string | number;
  metadata?: DSpaceMetadata[];
  bitstreams?: DSpaceBitstream[];
}

const SOURCES = {
  oapen: "https://library.oapen.org",
  doab: "https://directory.doabooks.org",
} as const;
const PDF_BASE = "https://library.oapen.org";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDSpaceItem(value: unknown): value is DSpaceItem {
  return (
    isRecord(value) &&
    (value.metadata === undefined || Array.isArray(value.metadata)) &&
    (value.bitstreams === undefined || Array.isArray(value.bitstreams))
  );
}

function metadataValue(item: DSpaceItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item.metadata
      ?.find((entry) => entry?.key === key && typeof entry.value === "string")
      ?.value?.trim();
    if (value) return value;
  }
  return "";
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatItem(item: DSpaceItem, source: AcademicSource, index: number): AcademicBook | null {
  const title = metadataValue(item, "dc.title");
  if (!title) return null;

  const pdf = item.bitstreams?.find(
    (bitstream) =>
      typeof bitstream?.mimeType === "string" &&
      bitstream.mimeType.toLowerCase() === "application/pdf" &&
      typeof bitstream.retrieveLink === "string",
  );
  const publisherUrl = safeHttpUrl(metadataValue(item, "dc.identifier.uri") || "");
  const retrieveLink = pdf?.retrieveLink;
  let pdfUrl: URL | null = null;
  if (retrieveLink) {
    try {
      pdfUrl = new URL(retrieveLink, SOURCES[source]);
    } catch {
      pdfUrl = null;
    }
  }
  const readUrl = pdfUrl
    ? new URL(`${pdfUrl.pathname}${pdfUrl.search}`, PDF_BASE).toString()
    : source === "doab" && publisherUrl
      ? publisherUrl
      : "";

  if (!readUrl) return null;

  const subjects = item.metadata
    ?.filter((m) => m?.key === "dc.subject" && typeof m.value === "string")
    .map((m) => m.value!.trim())
    .filter(Boolean)
    .slice(0, 10) ?? [];
  const language = (metadataValue(item, "dc.language.iso", "dc.language") || "EN").toUpperCase();
  const rawDate = metadataValue(item, "dc.date.issued", "dc.date");
  const year = rawDate ? rawDate.split("-")[0] : undefined;

  const id = item.uuid ?? item.handle ?? item.id ?? index;
  return {
    id: `${source}-${id}`,
    title,
    author: metadataValue(item, "dc.contributor.author", "dc.creator") || "Unknown",
    description: metadataValue(item, "dc.description.abstract", "dc.description"),
    cover: null,
    readUrl,
    format: "pdf",
    source,
    access: "free",
    subjects,
    language,
    year,
    ...(!pdfUrl && source === "doab" ? { external: true as const } : {}),
  };
}

async function searchDSpace(source: AcademicSource, query: string, page: number): Promise<AcademicBook[]> {
  const params = new URLSearchParams({
    query,
    expand: "metadata,bitstreams",
    rpp: "20",
    start: String((page - 1) * 20),
  });
  const response = await fetch(`${SOURCES[source]}/rest/search?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Nalexis/1.0 (book reader)" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`${source.toUpperCase()} search failed: ${response.status}`);

  const data: unknown = await response.json();
  const items = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.objects)
      ? data.objects
      : [];

  return items
    .filter(isDSpaceItem)
    .map((item, index) => formatItem(item, source, index))
    .filter((book): book is AcademicBook => book !== null);
}

export function searchOapen(query: string): Promise<AcademicBook[]> {
  return searchDSpace("oapen", query, 1);
}

export function searchDoab(query: string): Promise<AcademicBook[]> {
  return searchDSpace("doab", query, 1);
}

export function browseOapen(category: string, page: number): Promise<AcademicBook[]> {
  return searchDSpace("oapen", category, page);
}

export function browseDoab(category: string, page: number): Promise<AcademicBook[]> {
  return searchDSpace("doab", category, page);
}

export async function getAcademicBook(
  source: AcademicSource,
  id: string,
): Promise<AcademicBook | null> {
  const prefix = `${source}-`;
  const normalizedId = id.startsWith(prefix) ? id.slice(prefix.length) : id;
  const books = await searchDSpace(source, normalizedId, 1);
  return books.find((book) => {
    const itemId = book.id.replace(new RegExp(`^${source}-`), "");
    return itemId === normalizedId || book.id === id;
  }) ?? null;
}
