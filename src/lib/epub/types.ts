export interface EpubMetadata {
  title: string;
  creator: string;
  language: string;
  description: string;
  publisher?: string;
  pubDate?: string;
  rights?: string;
  identifier?: string;
  coverUrl?: string;
}

export interface EpubChapter {
  id: string;
  href: string;
  title: string;
  htmlContent: string;
  order: number;
}

export interface ParsedEpub {
  id: string;
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  totalChapters: number;
  fileSize: number;
  addedAt: string;
  lastOpenedAt?: string;
}

export interface ReaderBookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  progressPercent: number;
  previewText: string;
  note?: string;
  createdAt: string;
}

export interface ReaderHighlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  selectedText: string;
  color: "amber" | "emerald" | "sapphire" | "rose";
  note?: string;
  createdAt: string;
}

export interface SavedQuote {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapterIndex: number;
  chapterTitle: string;
  text: string;
  note?: string;
  savedAt: string;
}

export interface ReaderProgress {
  bookId: string;
  chapterIndex: number;
  scrollPercent: number;
  lastReadAt: string;
  cfi?: string;
  percentage?: number;
}

export interface ReaderPreferences {
  fontFamily: "serif" | "sans" | "mono";
  fontSize: number;
  lineHeight: "compact" | "normal" | "relaxed";
  contentWidth: "sm" | "md" | "lg";
  theme: "light" | "sepia" | "dark" | "oled";
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  audioUrl?: string;
}

export interface SavedVocabularyWord {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  phonetic?: string;
  example?: string;
  synonyms?: string[];
  bookId: string;
  bookTitle: string;
  chapterTitle?: string;
  chapterIndex?: number;
  savedAt: string;
}
