"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  Highlighter,
  MessageSquareQuote,
  Languages,
  X,
  Share2,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react";
import type { ApiBook } from "@/lib/books";
import {
  getBookmarks,
  getHighlights,
  getSavedVocabulary,
} from "@/lib/epub/storage";
import type {
  ReaderBookmark,
  ReaderHighlight,
  SavedVocabularyWord,
} from "@/lib/epub/types";

interface QuoteItem {
  id: string;
  source: string;
  book_id: string;
  text: string;
  note: string | null;
  is_shared: boolean;
  created_at: string;
}

interface BookNotesSlideoverProps {
  book: ApiBook;
  isOpen: boolean;
  onClose: () => void;
  readUrl?: string | null;
}

type TabType = "quotes" | "highlights" | "bookmarks" | "vocabulary";

export default function BookNotesSlideover({
  book,
  isOpen,
  onClose,
  readUrl,
}: BookNotesSlideoverProps) {
  const [activeTab, setActiveTab] = useState<TabType>("quotes");
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);
  const [vocabulary, setVocabulary] = useState<SavedVocabularyWord[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bookIdStr = String(book.id);

  const loadData = useCallback(() => {
    // 1. Fetch remote quotes
    setIsLoadingQuotes(true);
    fetch(`/api/quotes?source=${encodeURIComponent(book.source)}&bookId=${encodeURIComponent(bookIdStr)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: QuoteItem[]) => {
        setQuotes(data);
      })
      .catch(() => setQuotes([]))
      .finally(() => setIsLoadingQuotes(false));

    // 2. Fetch local EPUB items if stored on-device
    setBookmarks(getBookmarks(bookIdStr));
    setHighlights(getHighlights(bookIdStr));
    setVocabulary(getSavedVocabulary(bookIdStr));
  }, [book.source, bookIdStr]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const toggleShareQuote = async (quote: QuoteItem) => {
    try {
      const res = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, is_shared: !quote.is_shared }),
      });
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, is_shared: !quote.is_shared } : q))
        );
      }
    } catch {
      // non-fatal
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes?id=${encodeURIComponent(quoteId)}`, { method: "DELETE" });
      if (res.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      }
    } catch {
      // non-fatal
    }
  };

  const copyText = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
              {book.cover ? (
                <Image src={book.cover} alt={book.title} fill unoptimized className="object-cover" />
              ) : (
                <BookOpen className="size-6 m-auto inset-0 absolute text-zinc-400" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                Book Reflections & Notes
              </p>
              <h2 className="font-serif text-base font-bold text-[var(--text)] line-clamp-1">{book.title}</h2>
              <p className="text-xs text-[var(--text-muted)] line-clamp-1">{book.author}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-zinc-100 hover:text-[var(--text)] dark:hover:bg-zinc-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border)] bg-zinc-50/60 dark:bg-zinc-900/40 text-xs">
          <button
            onClick={() => setActiveTab("quotes")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "quotes"
                ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <MessageSquareQuote className="size-3.5" />
            <span>Quotes ({quotes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("highlights")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "highlights"
                ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Highlighter className="size-3.5" />
            <span>Highlights ({highlights.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "bookmarks"
                ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Bookmark className="size-3.5" />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("vocabulary")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "vocabulary"
                ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Languages className="size-3.5" />
            <span>Words ({vocabulary.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* QUOTES TAB */}
          {activeTab === "quotes" && (
            <>
              {isLoadingQuotes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-[var(--primary)]" />
                </div>
              ) : quotes.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquareQuote className="size-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-[var(--text)] font-serif font-medium">No saved quotes yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Highlight a meaningful passage while reading to save memorable quotes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-xs space-y-2"
                    >
                      <blockquote className="font-serif italic text-xs leading-relaxed text-[var(--text)]">
                        &ldquo;{quote.text}&rdquo;
                      </blockquote>
                      {quote.note && (
                        <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-1.5">
                          {quote.note}
                        </p>
                      )}
                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => toggleShareQuote(quote)}
                          className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
                            quote.is_shared
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Share2 className="size-3" />
                          <span>{quote.is_shared ? "Shared on profile" : "Make public"}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(quote.id, quote.text)}
                            className="rounded px-2 py-0.5 text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            {copiedId === quote.id ? "Copied!" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteQuote(quote.id)}
                            className="text-red-600 hover:text-red-700 p-0.5"
                            aria-label="Delete quote"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* HIGHLIGHTS TAB */}
          {activeTab === "highlights" && (
            <>
              {highlights.length === 0 ? (
                <div className="py-12 text-center">
                  <Highlighter className="size-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-[var(--text)] font-serif font-medium">No highlights yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Select text in the reader to create colorful highlights.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {highlights.map((h) => (
                    <div key={h.id} className="rounded-xl border border-[var(--border)] p-3 text-xs space-y-1.5">
                      <p className="font-serif italic leading-relaxed text-[var(--text)]">
                        &ldquo;{h.selectedText}&rdquo;
                      </p>
                      {h.note && <p className="text-[11px] text-[var(--text-muted)]">{h.note}</p>}
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
                        <span>{h.chapterTitle || "Chapter"}</span>
                        <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* BOOKMARKS TAB */}
          {activeTab === "bookmarks" && (
            <>
              {bookmarks.length === 0 ? (
                <div className="py-12 text-center">
                  <Bookmark className="size-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-[var(--text)] font-serif font-medium">No bookmarks yet</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Tap the bookmark icon while reading to preserve your place.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bookmarks.map((b) => (
                    <div key={b.id} className="rounded-xl border border-[var(--border)] p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text)]">{b.chapterTitle || "Bookmark"}</span>
                        <span className="text-[10px] text-[var(--primary)] font-medium">
                          {Math.round(b.progressPercent)}%
                        </span>
                      </div>
                      {b.previewText && (
                        <p className="line-clamp-2 text-[11px] text-[var(--text-muted)] italic">
                          &ldquo;{b.previewText}&rdquo;
                        </p>
                      )}
                      {b.note && <p className="text-[10px] text-[var(--text)] pt-0.5">{b.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VOCABULARY TAB */}
          {activeTab === "vocabulary" && (
            <>
              {vocabulary.length === 0 ? (
                <div className="py-12 text-center">
                  <Languages className="size-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-[var(--text)] font-serif font-medium">No saved vocabulary</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Look up unfamiliar words in the reader to build your personal vocabulary.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {vocabulary.map((v) => (
                    <div key={v.id} className="rounded-xl border border-[var(--border)] p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-serif text-sm text-[var(--text)]">{v.word}</span>
                        {v.partOfSpeech && (
                          <span className="text-[10px] text-[var(--text-muted)] italic">{v.partOfSpeech}</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text)] leading-relaxed">{v.definition}</p>
                      {v.example && (
                        <p className="text-[11px] text-[var(--text-muted)] italic pt-0.5">
                          Example: &ldquo;{v.example}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {readUrl && (
          <div className="border-t border-[var(--border)] p-4">
            <Link
              href={readUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <BookOpen className="size-4" />
              <span>Resume Reading</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
