import { getGutendexBook } from "@/lib/gutendex";
import { getOpenLibraryBook } from "@/lib/openlibrary";
import { getAcademicBook } from "@/lib/academicbooks";
import type { ApiBook, BookSource } from "@/lib/books";

export async function getBookDetails(source: BookSource, id: string): Promise<ApiBook | null> {
  switch (source) {
    case "gutenberg": {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
      return getGutendexBook(numericId);
    }
    case "openlibrary":
      return getOpenLibraryBook(id);
    case "oapen":
    case "doab":
      return getAcademicBook(source, id);
  }
}
