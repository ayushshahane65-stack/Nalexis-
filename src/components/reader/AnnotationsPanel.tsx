"use client";

import { useState } from "react";
import {
  Bookmark,
  Highlighter,
  Quote,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import type {
  ReaderBookmark,
  ReaderHighlight,
  SavedQuote,
} from "@/lib/epub/types";
import {
  deleteBookmark,
  getBookmarks,
  updateBookmarkNote,
  deleteHighlight,
  getHighlights,
  updateHighlightNote,
  deleteQuote,
  getQuotes,
  updateQuoteNote,
} from "@/lib/epub/storage";

type Tab = "bookmarks" | "highlights" | "quotes";

interface AnnotationsPanelProps {
  bookId: string;
  bookmarks: ReaderBookmark[];
  highlights: ReaderHighlight[];
  quotes: SavedQuote[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onBookmarksChange: () => void;
  onHighlightsChange: () => void;
  onQuotesChange: () => void;
  onNavigateToChapter: (chapterIndex: number) => void;
  /** Called with a bookmark id to confirm+delete */
  onDeleteBookmarkRequest: (id: string) => void;
  theme: "light" | "sepia" | "dark" | "oled";
}

const HIGHLIGHT_COLOR_CLASSES: Record<string, string> = {
  amber: "bg-amber-400",
  emerald: "bg-emerald-500",
  sapphire: "bg-sky-500",
  rose: "bg-rose-500",
};

const HIGHLIGHT_TEXT_CLASSES: Record<string, string> = {
  amber: "bg-amber-100 dark:bg-amber-950/40",
  emerald: "bg-emerald-100 dark:bg-emerald-950/40",
  sapphire: "bg-sky-100 dark:bg-sky-950/40",
  rose: "bg-rose-100 dark:bg-rose-950/40",
};

export default function AnnotationsPanel({
  bookId,
  bookmarks,
  highlights,
  quotes,
  activeTab,
  onTabChange,
  onBookmarksChange,
  onHighlightsChange,
  onQuotesChange,
  onNavigateToChapter,
  onDeleteBookmarkRequest,
  theme,
}: AnnotationsPanelProps) {
  const isDark = theme === "dark" || theme === "oled";
  const isSepia = theme === "sepia";

  const subtleText = isDark ? "text-zinc-400" : isSepia ? "text-[#6e553f]" : "text-zinc-500";
  const cardBorder = isDark
    ? "border-zinc-800 bg-zinc-900/50"
    : isSepia
    ? "border-[#d8c09a] bg-[#fbf0d9]/70"
    : "border-zinc-200 bg-white";
  const bodyText = isDark ? "text-zinc-100" : isSepia ? "text-[#2d241e]" : "text-zinc-900";

  // Note editing state: maps id to current draft value
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "bookmarks", label: "Bookmarks", icon: <Bookmark className="size-3.5" />, count: bookmarks.length },
    { id: "highlights", label: "Highlights", icon: <Highlighter className="size-3.5" />, count: highlights.length },
    { id: "quotes", label: "Quotes", icon: <Quote className="size-3.5" />, count: quotes.length },
  ];

  const startEditNote = (id: string, existing?: string) => {
    setEditingNoteId(id);
    setNoteDraft(existing ?? "");
  };
  const cancelEdit = () => {
    setEditingNoteId(null);
    setNoteDraft("");
  };

  const saveHighlightNoteEdit = (id: string) => {
    updateHighlightNote(id, noteDraft);
    onHighlightsChange();
    cancelEdit();
  };

  const saveBookmarkNoteEdit = (id: string) => {
    updateBookmarkNote(id, noteDraft);
    onBookmarksChange();
    cancelEdit();
  };

  const saveQuoteNoteEdit = (id: string) => {
    updateQuoteNote(id, noteDraft);
    onQuotesChange();
    cancelEdit();
  };

  const handleDeleteHighlight = (id: string) => {
    deleteHighlight(id);
    onHighlightsChange();
  };

  const handleDeleteQuote = (id: string) => {
    deleteQuote(id);
    onQuotesChange();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Tab Bar */}
      <div className={`flex shrink-0 border-b ${isDark ? "border-zinc-800" : isSepia ? "border-[#d8c09a]" : "border-zinc-200"}`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : `${subtleText} hover:${bodyText}`
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 font-mono tabular-nums text-[9px] ${
                  activeTab === tab.id
                    ? "bg-emerald-700 text-white"
                    : isDark
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable panel body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* ── BOOKMARKS ── */}
        {activeTab === "bookmarks" && (
          <>
            {bookmarks.length === 0 ? (
              <EmptyState
                icon={<Bookmark className="size-6" />}
                heading="No bookmarks yet"
                body="Click the bookmark icon next to any chapter heading to save your place."
              />
            ) : (
              bookmarks.map((bm) => (
                <article
                  key={bm.id}
                  className={`rounded-lg border p-3 ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToChapter(bm.chapterIndex)}
                      className={`flex-1 text-left text-xs font-semibold ${bodyText} hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Bookmark className="size-3 shrink-0 text-emerald-600" />
                        <span className="line-clamp-2">{bm.chapterTitle}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditNote(bm.id, bm.note)}
                        aria-label="Edit note on bookmark"
                        className={`rounded p-0.5 ${subtleText} hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors`}
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBookmarkRequest(bm.id)}
                        aria-label="Delete bookmark"
                        className={`rounded p-0.5 ${subtleText} hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  <p className={`mt-1 text-[10px] ${subtleText}`}>{bm.createdAt}</p>

                  {/* Inline note editor */}
                  {editingNoteId === bm.id ? (
                    <NoteEditor
                      value={noteDraft}
                      onChange={setNoteDraft}
                      onSave={() => saveBookmarkNoteEdit(bm.id)}
                      onCancel={cancelEdit}
                      theme={theme}
                    />
                  ) : bm.note ? (
                    <p className={`mt-1.5 text-[11px] italic leading-snug ${subtleText}`}>
                      &ldquo;{bm.note}&rdquo;
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onNavigateToChapter(bm.chapterIndex)}
                    className="mt-2 flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Go to chapter <ChevronRight className="size-3" />
                  </button>
                </article>
              ))
            )}
          </>
        )}

        {/* ── HIGHLIGHTS ── */}
        {activeTab === "highlights" && (
          <>
            {highlights.length === 0 ? (
              <EmptyState
                icon={<Highlighter className="size-6" />}
                heading="No highlights yet"
                body="Select any text in the book, then choose a colour to highlight it. Tap &ldquo;Add Note&rdquo; to attach a private thought."
              />
            ) : (
              highlights.map((hl) => (
                <article
                  key={hl.id}
                  className={`rounded-lg border p-3 ${cardBorder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`size-2.5 rounded-full ${HIGHLIGHT_COLOR_CLASSES[hl.color] ?? "bg-amber-400"}`}
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => startEditNote(hl.id, hl.note)}
                        aria-label="Edit note on highlight"
                        className={`rounded p-0.5 ${subtleText} hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors`}
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(hl.id)}
                        aria-label="Delete highlight"
                        className={`rounded p-0.5 ${subtleText} hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  <blockquote
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateToChapter(hl.chapterIndex)}
                    onKeyDown={(e) => e.key === "Enter" && onNavigateToChapter(hl.chapterIndex)}
                    className={`mt-2 cursor-pointer rounded px-2 py-1.5 text-xs italic leading-relaxed ${HIGHLIGHT_TEXT_CLASSES[hl.color] ?? "bg-amber-100 dark:bg-amber-950/40"} ${bodyText} hover:underline`}
                  >
                    &ldquo;{hl.selectedText}&rdquo;
                  </blockquote>

                  {editingNoteId === hl.id ? (
                    <NoteEditor
                      value={noteDraft}
                      onChange={setNoteDraft}
                      onSave={() => saveHighlightNoteEdit(hl.id)}
                      onCancel={cancelEdit}
                      theme={theme}
                    />
                  ) : hl.note ? (
                    <p className={`mt-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300`}>
                      Note: {hl.note}
                    </p>
                  ) : null}

                  <p className={`mt-1.5 text-[10px] ${subtleText}`}>
                    {hl.chapterTitle} &middot; {hl.createdAt}
                  </p>
                </article>
              ))
            )}
          </>
        )}

        {/* ── QUOTES ── */}
        {activeTab === "quotes" && (
          <>
            {quotes.length === 0 ? (
              <EmptyState
                icon={<Quote className="size-6" />}
                heading="No saved quotes yet"
                body="Select text in the book and tap &ldquo;Save Quote&rdquo; to build your private collection."
              />
            ) : (
              quotes.map((q) => (
                <article
                  key={q.id}
                  className={`rounded-lg border p-3 ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Quote className="size-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => startEditNote(q.id, q.note)}
                        aria-label="Edit note on quote"
                        className={`rounded p-0.5 ${subtleText} hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors`}
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(q.id)}
                        aria-label="Delete saved quote"
                        className={`rounded p-0.5 ${subtleText} hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  <blockquote
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateToChapter(q.chapterIndex)}
                    onKeyDown={(e) => e.key === "Enter" && onNavigateToChapter(q.chapterIndex)}
                    className={`mt-2 cursor-pointer text-xs italic leading-relaxed ${bodyText} hover:underline`}
                  >
                    &ldquo;{q.text}&rdquo;
                  </blockquote>

                  {editingNoteId === q.id ? (
                    <NoteEditor
                      value={noteDraft}
                      onChange={setNoteDraft}
                      onSave={() => saveQuoteNoteEdit(q.id)}
                      onCancel={cancelEdit}
                      theme={theme}
                    />
                  ) : q.note ? (
                    <p className={`mt-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300`}>
                      Note: {q.note}
                    </p>
                  ) : null}

                  <p className={`mt-1.5 text-[10px] ${subtleText}`}>
                    {q.chapterTitle} &middot; {q.savedAt}
                  </p>
                </article>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  body: string;
}
function EmptyState({ icon, heading, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 text-zinc-400">{icon}</div>
      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{heading}</p>
      <p
        className="mt-1 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

interface NoteEditorProps {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  theme: "light" | "sepia" | "dark" | "oled";
}
function NoteEditor({ value, onChange, onSave, onCancel, theme }: NoteEditorProps) {
  const isDark = theme === "dark" || theme === "oled";
  const isSepia = theme === "sepia";
  return (
    <div className="mt-2 space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a private note..."
        rows={3}
        autoFocus
        aria-label="Note text"
        className={`w-full resize-none rounded-md border px-2.5 py-1.5 text-xs leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
          isDark
            ? "border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            : isSepia
            ? "border-[#d8c09a] bg-[#fbf0d9] text-[#2d241e] placeholder:text-[#8a725b]"
            : "border-zinc-300 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400"
        }`}
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          aria-label="Save note"
          className="flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          <Check className="size-3" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel editing note"
          className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium hover:opacity-80 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
            isDark ? "border-zinc-700 text-zinc-300" : "border-zinc-300 text-zinc-600"
          }`}
        >
          <X className="size-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
