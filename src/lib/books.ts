export type BookSource = "gutenberg" | "openlibrary" | "oapen" | "doab";

export interface ApiBook {
  id: string | number;
  title: string;
  author: string;
  description: string;
  cover: string | null;
  readUrl: string | null;
  source: BookSource;
  access: "public" | "borrowable" | "no_ebook" | "free";
  format?: "pdf";
  external?: true;
  subjects?: string[];
  language?: string;
  year?: number | string;
}

export function isReadableBook(book: ApiBook): boolean {
  if (!book.readUrl || book.external) return false;
  if (book.source === "gutenberg") return true;
  if (book.source === "openlibrary") return Boolean(book.readUrl && (book.access === "public" || book.access === "borrowable"));
  return book.format === "pdf";
}
