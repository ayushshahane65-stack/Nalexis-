"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  Highlighter,
  Sliders,
  Maximize2,
  Minimize2,
  List,
  ArrowLeft,
  ArrowUp,
  X,
  BookOpen,
  BookA,
  Quote,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import type {
  ParsedEpub,
  ReaderBookmark,
  ReaderHighlight,
  ReaderPreferences,
  SavedQuote,
  SavedVocabularyWord,
} from "@/lib/epub/types";
import {
  getPreferences,
  savePreferences,
  getProgress,
  saveProgress,
  getBookmarks,
  saveBookmark,
  deleteBookmark,
  getHighlights,
  saveHighlight,
  getQuotes,
  saveQuote,
  getSavedVocabulary,
  isStorageAvailable,
} from "@/lib/epub/storage";
import DefinitionPanel from "./DefinitionPanel";
import VocabularySection from "./VocabularySection";
import AnnotationsPanel from "./AnnotationsPanel";

interface WebReaderProps {
  book: ParsedEpub;
}

const THEME_STYLES = {
  light: {
    bg: "bg-zinc-50",
    text: "text-zinc-900",
    surface: "bg-white",
    border: "border-zinc-200",
    divider: "border-zinc-200",
    prose: "text-zinc-800",
    subtle: "text-zinc-600",
    hoverBg: "hover:bg-zinc-100",
    activeBg: "bg-emerald-100 text-emerald-900",
    controlBg: "bg-white",
  },
  sepia: {
    bg: "bg-[#fbf0d9]",
    text: "text-[#2d241e]",
    surface: "bg-[#f4e4c3]",
    border: "border-[#dec8a0]",
    divider: "border-[#dec8a0]",
    prose: "text-[#2d241e]",
    subtle: "text-[#6e553f]",
    hoverBg: "hover:bg-[#ebd3ab]",
    activeBg: "bg-[#ebd3ab] text-[#2d241e]",
    controlBg: "bg-[#fbf0d9]",
  },
  dark: {
    bg: "bg-zinc-950",
    text: "text-zinc-100",
    surface: "bg-zinc-900",
    border: "border-zinc-800",
    divider: "border-zinc-800",
    prose: "text-zinc-200",
    subtle: "text-zinc-400",
    hoverBg: "hover:bg-zinc-800",
    activeBg: "bg-zinc-800 text-emerald-400",
    controlBg: "bg-zinc-900",
  },
  oled: {
    bg: "bg-black",
    text: "text-zinc-100",
    surface: "bg-zinc-950",
    border: "border-zinc-900",
    divider: "border-zinc-900",
    prose: "text-zinc-200",
    subtle: "text-zinc-400",
    hoverBg: "hover:bg-zinc-900",
    activeBg: "bg-zinc-900 text-emerald-400",
    controlBg: "bg-black",
  },
};

const FONT_CLASSES = {
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
};

const WIDTH_CLASSES = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

const LINE_HEIGHT_CLASSES = {
  compact: "leading-normal",
  normal: "leading-relaxed",
  relaxed: "leading-loose",
};

const HIGHLIGHT_COLORS: Array<{
  name: "amber" | "emerald" | "sapphire" | "rose";
  label: string;
  badgeClass: string;
}> = [
  { name: "amber", label: "Amber", badgeClass: "bg-amber-500" },
  { name: "emerald", label: "Emerald", badgeClass: "bg-emerald-500" },
  { name: "sapphire", label: "Sapphire", badgeClass: "bg-sky-500" },
  { name: "rose", label: "Rose", badgeClass: "bg-rose-500" },
];

const THEME_OPTIONS = [
  { id: "light", label: "Crisp", bg: "bg-[#fafafa]", text: "text-zinc-900", border: "border-zinc-300" },
  { id: "sepia", label: "Sepia", bg: "bg-[#fbf0d9]", text: "text-[#2d241e]", border: "border-[#d8c09a]" },
  { id: "dark", label: "Dark", bg: "bg-[#18181b]", text: "text-zinc-100", border: "border-zinc-700" },
  { id: "oled", label: "OLED", bg: "bg-[#000000]", text: "text-zinc-100", border: "border-zinc-800" },
];

function generateHighlightId(prefix = "hl"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Pure function — runs outside React.
 * Uses DOMParser + TreeWalker to find text matching each highlight and wrap
 * it in a <mark> element.  Works correctly even when the text spans across
 * inline HTML tags (e.g. <em>, <strong>).
 *
 * @param html   Raw chapter HTML from the EPUB parser
 * @param hls    Highlights for this chapter
 * @returns      HTML string with <mark> elements injected
 */
function injectHighlightsViaDom(
  html: string,
  hls: import("@/lib/epub/types").ReaderHighlight[]
): string {
  if (typeof document === "undefined" || hls.length === 0) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.querySelector("div")!;

    for (const hl of hls) {
      const targetText = hl.selectedText;
      if (!targetText) continue;

      // Walk all text nodes inside the chapter root
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const idx = node.nodeValue?.indexOf(targetText) ?? -1;
        if (idx === -1) continue;

        // Split the text node at the match boundaries
        const before = node.splitText(idx);
        before.splitText(targetText.length); // splits off the trailing text node

        // Create the <mark> wrapper
        const mark = doc.createElement("mark");
        mark.className = `nalexis-hl nalexis-hl-${hl.color}`;
        mark.setAttribute("data-hl-id", hl.id);
        mark.textContent = before.nodeValue;

        // Replace the middle text node with the mark
        before.parentNode?.replaceChild(mark, before);

        // Advance walker past the newly inserted mark + after node
        // by re-creating it from the `after` node's parent context
        break; // highlight each occurrence only once
      }
    }

    return root.innerHTML;
  } catch {
    // If DOMParser fails (e.g. SSR), return raw HTML unchanged
    return html;
  }
}



export default function WebReader({ book }: WebReaderProps) {
  // Reading state
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 100
  const [prefs, setPrefs] = useState<ReaderPreferences>(getPreferences());
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([]);

  // Drawers and overlays
  const [sidebarTab, setSidebarTab] = useState<
    "toc" | "annotations" | "vocabulary" | null
  >(null);
  const [annotationsTab, setAnnotationsTab] = useState<
    "bookmarks" | "highlights" | "quotes"
  >("bookmarks");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Quotes state
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);

  // Bookmark delete confirmation
  const [bookmarkToDelete, setBookmarkToDelete] = useState<string | null>(null);

  // Storage warning
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  // Private Vocabulary & Reading Helper state
  const [vocabulary, setVocabulary] = useState<SavedVocabularyWord[]>([]);
  const [isDefinitionOpen, setIsDefinitionOpen] = useState(false);
  const [selectedWordForDefinition, setSelectedWordForDefinition] = useState("");

  // Floating text selection
  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    cleanWord?: string;
    isSingleWord: boolean;
    rect: DOMRect | null;
  } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingColor, setPendingColor] = useState<"amber" | "emerald" | "sapphire" | "rose">("amber");

  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollRestored = useRef(false);
  /** Holds the live browser Range from the user's last text selection */
  const savedRangeRef = useRef<Range | null>(null);
  /** Per-chapter HTML with <mark> tags applied; used instead of chapter.htmlContent when set */
  const [chapterHtmlMap, setChapterHtmlMap] = useState<Record<number, string>>({});

  const t = THEME_STYLES[prefs.theme] || THEME_STYLES.light;
  const currentChapter = book.chapters[activeChapterIndex] || book.chapters[0];

  const reloadVocabulary = useCallback(() => {
    setVocabulary(getSavedVocabulary(book.id));
  }, [book.id]);

  // 1. Initial Load: Restore progress, bookmarks, highlights, vocabulary, quotes
  useEffect(() => {
    // Check storage availability once on mount
    if (!isStorageAvailable()) {
      setStorageUnavailable(true);
    }

    const savedBookmarks = getBookmarks(book.id);
    const savedHighlights = getHighlights(book.id);
    const savedVocab = getSavedVocabulary(book.id);
    const savedPrefs = getPreferences();
    const savedProgress = getProgress(book.id);
    const savedQuotes = getQuotes(book.id);

    const frameId = requestAnimationFrame(() => {
      setBookmarks(savedBookmarks);
      setHighlights(savedHighlights);
      setVocabulary(savedVocab);
      setPrefs(savedPrefs);
      setQuotes(savedQuotes);

      if (savedProgress && containerRef.current && !isInitialScrollRestored.current) {
        isInitialScrollRestored.current = true;
        setTimeout(() => {
          if (!containerRef.current) return;
          const { scrollHeight, clientHeight } = containerRef.current;
          const targetScroll = ((scrollHeight - clientHeight) * savedProgress.scrollPercent) / 100;
          containerRef.current.scrollTo({ top: targetScroll, behavior: "auto" });
          if (savedProgress.chapterIndex >= 0 && savedProgress.chapterIndex < book.chapters.length) {
            setActiveChapterIndex(savedProgress.chapterIndex);
          }
        }, 100);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [book.id, book.chapters.length]);

  // 2. Track overall continuous scroll & detect active chapter
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const pct = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100))) : 0;
    setScrollProgress(pct);

    const containerTop = containerRef.current.getBoundingClientRect().top;
    let foundIndex = 0;

    for (let i = 0; i < book.chapters.length; i++) {
      const el = document.getElementById(`chapter-${i}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top - containerTop <= 180) {
          foundIndex = i;
        }
      }
    }

    setActiveChapterIndex(foundIndex);

    saveProgress({
      bookId: book.id,
      chapterIndex: foundIndex,
      scrollPercent: pct,
      lastReadAt: new Date().toISOString(),
    });
  }, [book.id, book.chapters.length]);

  // 3. Scroll directly to a specific chapter in the continuous stream
  const scrollToChapter = (index: number) => {
    const el = document.getElementById(`chapter-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveChapterIndex(index);
      setSidebarTab(null);
    }
  };

  // 4. Scroll to top
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 5. Bookmark Current Location
  const toggleBookmarkCurrent = () => {
    const existing = bookmarks.find((b) => b.chapterIndex === activeChapterIndex);
    if (existing) {
      deleteBookmark(existing.id);
      setBookmarks(getBookmarks(book.id));
    } else {
      const newBm: ReaderBookmark = {
        id: `bm-${Date.now()}`,
        bookId: book.id,
        chapterIndex: activeChapterIndex,
        chapterTitle: currentChapter.title,
        progressPercent: scrollProgress,
        previewText: currentChapter.title,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      saveBookmark(newBm);
      setBookmarks(getBookmarks(book.id));
    }
  };

  // 6. Handle selection for in-place text highlighting & dictionary lookup
  const handleMouseUp = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionRange(null);
        savedRangeRef.current = null;
        return;
      }
      const rawText = sel.toString().trim();
      if (rawText.length < 1) {
        setSelectionRange(null);
        savedRangeRef.current = null;
        return;
      }

      // Clean word for single-word dictionary lookup
      const cleanWord = rawText
        .replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "")
        .trim();
      const isSingleWord =
        cleanWord.length > 0 &&
        !/\s/.test(cleanWord) &&
        /^[a-zA-Z\u00C0-\u024F'-]+$/.test(cleanWord);

      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setSelectionRange(null);
          savedRangeRef.current = null;
          return;
        }
        // Persist the Range so handleApplyHighlight can use it before it's cleared
        savedRangeRef.current = range.cloneRange();
        setSelectionRange({
          text: rawText,
          cleanWord: isSingleWord ? cleanWord : undefined,
          isSingleWord,
          rect,
        });
      } catch {
        setSelectionRange(null);
        savedRangeRef.current = null;
      }
    }, 10);
  };

  const reloadBookmarks = useCallback(() => {
    setBookmarks(getBookmarks(book.id));
  }, [book.id]);

  const reloadHighlights = useCallback(() => {
    setHighlights(getHighlights(book.id));
  }, [book.id]);

  const reloadQuotes = useCallback(() => {
    setQuotes(getQuotes(book.id));
  }, [book.id]);

  /**
   * Re-apply persisted highlights from localStorage into the rendered DOM.
   * Runs once after highlights are loaded on initial mount, and whenever
   * highlights change (e.g. after a delete from the Annotations panel).
   *
   * Strategy: Use DOMParser + TreeWalker to find text nodes containing the
   * highlight text, wrap them in <mark>, then store the resulting innerHTML
   * into chapterHtmlMap so React renders it via dangerouslySetInnerHTML.
   */
  useEffect(() => {
    if (highlights.length === 0) {
      setChapterHtmlMap({});
      return;
    }
    const newMap: Record<number, string> = {};
    for (let idx = 0; idx < book.chapters.length; idx++) {
      const chapterHls = highlights.filter((h) => h.chapterIndex === idx);
      if (chapterHls.length === 0) continue;
      const html = book.chapters[idx].htmlContent;
      const injected = injectHighlightsViaDom(html, chapterHls);
      newMap[idx] = injected;
    }
    setChapterHtmlMap(newMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights]);

  /**
   * Wrap the live browser Range in a <mark> element immediately, then capture
   * the section's innerHTML so the chapterHtmlMap stays in sync with the DOM.
   * Falls back gracefully if surroundContents() fails (cross-node selections).
   */
  const applyDomHighlight = (
    id: string,
    color: "amber" | "emerald" | "sapphire" | "rose",
    chapterIndex: number
  ) => {
    const range = savedRangeRef.current;
    if (!range) return;
    try {
      const mark = document.createElement("mark");
      mark.className = `nalexis-hl nalexis-hl-${color}`;
      mark.dataset.hlId = id;
      try {
        range.surroundContents(mark);
      } catch {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
      // Capture the modified HTML immediately — before React's re-render
      // replaces the DOM. This becomes the source of truth for this chapter.
      const proseEl = document.querySelector<HTMLElement>(
        `#chapter-${chapterIndex} .reading-prose`
      );
      if (proseEl) {
        const captured = proseEl.innerHTML;
        setChapterHtmlMap((prev) => ({ ...prev, [chapterIndex]: captured }));
      }
    } catch {
      // DOM manipulation failed entirely; the localStorage entry still exists
      // and will be re-applied via the highlights useEffect on the next render.
    }
    savedRangeRef.current = null;
  };

  const handleSaveQuote = () => {
    if (!selectionRange) return;
    const newQuote: SavedQuote = {
      id: generateHighlightId("quote"),
      bookId: book.id,
      bookTitle: book.metadata.title,
      bookAuthor: book.metadata.creator,
      chapterIndex: activeChapterIndex,
      chapterTitle: currentChapter.title,
      text: selectionRange.text,
      savedAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    };
    saveQuote(newQuote);
    setQuotes(getQuotes(book.id));
    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
    savedRangeRef.current = null;
  };

  const handleApplyHighlight = (color: "amber" | "emerald" | "sapphire" | "rose") => {
    if (!selectionRange) return;
    const id = generateHighlightId("hl");
    // 1. Wrap the selection in-place in the DOM, capture innerHTML into chapterHtmlMap
    applyDomHighlight(id, color, activeChapterIndex);
    // 2. Persist to localStorage
    const newHl: ReaderHighlight = {
      id,
      bookId: book.id,
      chapterIndex: activeChapterIndex,
      chapterTitle: currentChapter.title,
      selectedText: selectionRange.text,
      color,
      createdAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
    saveHighlight(newHl);
    setHighlights(getHighlights(book.id));
    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
  };

  const handleSaveHighlightWithNote = () => {
    if (!selectionRange) return;
    const id = generateHighlightId("hl");
    applyDomHighlight(id, pendingColor, activeChapterIndex);
    const newHl: ReaderHighlight = {
      id,
      bookId: book.id,
      chapterIndex: activeChapterIndex,
      chapterTitle: currentChapter.title,
      selectedText: selectionRange.text,
      color: pendingColor,
      note: noteInput.trim() || undefined,
      createdAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
    saveHighlight(newHl);
    setHighlights(getHighlights(book.id));
    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
    savedRangeRef.current = null;
    setShowNoteModal(false);
    setNoteInput("");
  };

  const handleConfirmDeleteBookmark = () => {
    if (!bookmarkToDelete) return;
    deleteBookmark(bookmarkToDelete);
    setBookmarks(getBookmarks(book.id));
    setBookmarkToDelete(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const isCurrentChapterBookmarked = bookmarks.some((b) => b.chapterIndex === activeChapterIndex);

  return (
    <div
      className={`relative flex h-screen w-screen flex-col overflow-hidden ${t.bg} ${t.text} transition-colors duration-200 select-text`}
      data-reader-theme={prefs.theme}
      onMouseUp={handleMouseUp}
    >
      {/* ── Top Header Bar (100% Theme Synchronized) ───────────── */}
      <header
        className={`flex h-14 shrink-0 items-center justify-between border-b px-4 ${t.surface} ${t.border} z-30 shadow-xs`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/read"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${t.subtle} hover:${t.text} ${t.hoverBg} transition-colors active:scale-[0.98]`}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Library Hub</span>
          </Link>

          <div className={`h-4 w-px ${t.border}`} aria-hidden="true" />

          {/* Book Title & Live Active Chapter */}
          <div className="flex min-w-0 flex-col">
            <h1 className={`truncate font-serif text-sm font-bold ${t.text}`}>
              {book.metadata.title}
            </h1>
            <p className={`truncate text-[11px] font-medium ${t.subtle}`}>
              Ch. {activeChapterIndex + 1} of {book.totalChapters}: {currentChapter.title}
            </p>
          </div>
        </div>

        {/* Global Action Icons (Theme-Adaptive) */}
        <div className="flex items-center gap-1">
          {/* Quick Chapter Selector */}
          <button
            type="button"
            onClick={() => setSidebarTab(sidebarTab === "toc" ? null : "toc")}
            aria-label="Table of contents"
            title="Table of contents"
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-all active:scale-[0.98] ${
              sidebarTab === "toc"
                ? "bg-emerald-700 text-white font-medium shadow-xs"
                : `${t.text} ${t.hoverBg}`
            }`}
          >
            <List className="size-4" />
            <span className="hidden md:inline font-medium">Contents</span>
          </button>

          {/* Bookmark Current Chapter */}
          <button
            type="button"
            onClick={toggleBookmarkCurrent}
            aria-label="Bookmark current chapter"
            title="Bookmark"
            className={`rounded-md p-2 text-xs transition-all active:scale-[0.98] ${
              isCurrentChapterBookmarked
                ? "bg-emerald-700 text-white shadow-xs"
                : `${t.text} ${t.hoverBg}`
            }`}
          >
            {isCurrentChapterBookmarked ? (
              <BookmarkCheck className="size-4 text-white" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </button>

          {/* Annotations (Bookmarks, Highlights, Quotes) */}
          <button
            type="button"
            onClick={() => setSidebarTab(sidebarTab === "annotations" ? null : "annotations")}
            aria-label="View annotations — bookmarks, highlights and quotes"
            title="Annotations"
            className={`relative rounded-md p-2 text-xs transition-all active:scale-[0.98] ${
              sidebarTab === "annotations"
                ? "bg-emerald-700 text-white shadow-xs"
                : `${t.text} ${t.hoverBg}`
            }`}
          >
            <Highlighter className="size-4" />
            {(bookmarks.length > 0 || highlights.length > 0 || quotes.length > 0) && (
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500 ring-1 ring-white" />
            )}
          </button>


          {/* Private Vocabulary Notebook */}
          <button
            type="button"
            onClick={() => setSidebarTab(sidebarTab === "vocabulary" ? null : "vocabulary")}
            aria-label="View private vocabulary notebook"
            title="Private Vocabulary Notebook"
            className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
              sidebarTab === "vocabulary"
                ? "bg-emerald-700 text-white shadow-xs"
                : `${t.text} ${t.hoverBg}`
            }`}
          >
            <BookA className="size-4" />
            <span className="hidden lg:inline font-medium">Vocabulary</span>
            {vocabulary.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums font-semibold ${
                sidebarTab === "vocabulary"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-700 text-white dark:bg-emerald-600"
              }`}>
                {vocabulary.length}
              </span>
            )}
          </button>

          {/* Display Settings */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Typography and display settings"
            title="Display settings"
            className={`rounded-md p-2 text-xs transition-all active:scale-[0.98] ${
              settingsOpen
                ? "bg-emerald-700 text-white shadow-xs"
                : `${t.text} ${t.hoverBg}`
            }`}
          >
            <Sliders className="size-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            title="Fullscreen"
            className={`hidden rounded-md p-2 text-xs ${t.text} ${t.hoverBg} active:scale-[0.98] sm:block`}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Continuous Reading Area (Whole Book in One Go) ─── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Continuous Stream Main Column */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 md:py-12 scroll-smooth"
        >
          <article
            className={`mx-auto ${WIDTH_CLASSES[prefs.contentWidth]} ${FONT_CLASSES[prefs.fontFamily]} ${
              LINE_HEIGHT_CLASSES[prefs.lineHeight]
            }`}
            style={{ fontSize: `${prefs.fontSize}px` }}
          >
            {/* Book Front Matter / Title Header */}
            <div className={`mb-14 border-b pb-8 text-center ${t.divider}`}>
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-semibold">
                Nalexis Continuous Edition · Complete Volume
              </span>
              <h1 className={`mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl ${t.text}`}>
                {book.metadata.title}
              </h1>
              <p className={`mt-2 text-base ${t.subtle}`}>
                by <span className={`font-semibold ${t.text}`}>{book.metadata.creator}</span>
              </p>
              {book.metadata.description && (
                <p className={`mx-auto mt-4 max-w-lg text-xs leading-relaxed ${t.subtle}`}>
                  {book.metadata.description}
                </p>
              )}
            </div>

            {/* All Chapters Rendered Continuously in One Stream */}
            <div className="flex flex-col gap-12">
              {book.chapters.map((chapter, idx) => (
                <section
                  key={chapter.id}
                  id={`chapter-${idx}`}
                  data-chapter-index={idx}
                  className="chapter-section scroll-mt-20 pt-4"
                >
                  {/* Chapter Anchor Title */}
                  <div className={`mb-6 flex items-baseline justify-between border-b pb-3 ${t.divider}`}>
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                        Section {idx + 1} of {book.totalChapters}
                      </span>
                      <h2 className={`mt-0.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl ${t.text}`}>
                        {chapter.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const existing = bookmarks.find((b) => b.chapterIndex === idx);
                        if (existing) {
                          deleteBookmark(existing.id);
                        } else {
                          saveBookmark({
                            id: `bm-${Date.now()}`,
                            bookId: book.id,
                            chapterIndex: idx,
                            chapterTitle: chapter.title,
                            progressPercent: Math.round(((idx + 1) / book.totalChapters) * 100),
                            previewText: chapter.title,
                            createdAt: new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                          });
                        }
                        setBookmarks(getBookmarks(book.id));
                      }}
                      title="Bookmark this chapter"
                      className={`rounded-md p-1.5 ${t.subtle} hover:${t.text} active:scale-[0.98]`}
                    >
                      {bookmarks.some((b) => b.chapterIndex === idx) ? (
                        <BookmarkCheck className="size-4 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <Bookmark className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Chapter Body Content — highlights injected via chapterHtmlMap */}
                  <div
                    className={`reading-prose space-y-4 ${t.prose}`}
                    dangerouslySetInnerHTML={{
                      __html: chapterHtmlMap[idx] ?? chapter.htmlContent,
                    }}
                  />

                  {/* Elegant Chapter Separator Ornament */}
                  {idx < book.chapters.length - 1 && (
                    <div
                      className={`my-16 flex items-center justify-center gap-4 ${t.subtle}`}
                      aria-hidden="true"
                    >
                      <div className="h-px w-24 bg-current opacity-30" />
                      <span className="text-sm font-serif">❦</span>
                      <div className="h-px w-24 bg-current opacity-30" />
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* End of Volume Footer */}
            <div className={`mt-20 border-t pt-10 text-center ${t.divider}`}>
              <span className="font-serif text-sm font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase">
                End of Volume
              </span>
              <p className={`mt-2 text-xs ${t.subtle}`}>
                You have reached the final chapter of {book.metadata.title}.
              </p>
              <button
                type="button"
                onClick={scrollToTop}
                className={`mt-4 inline-flex items-center gap-1.5 rounded-md border ${t.border} ${t.surface} ${t.text} px-4 py-2 text-xs font-medium hover:opacity-80 active:scale-[0.98] shadow-xs`}
              >
                <ArrowUp className="size-3.5" />
                <span>Return to top</span>
              </button>
            </div>
          </article>
        </main>

        {/* ── Sidebar Drawers ────────── */}
        {sidebarTab && (
          <aside
            className={`w-80 shrink-0 border-l ${t.surface} ${t.border} ${t.text} z-20 flex flex-col shadow-lg animate-in slide-in-from-right-4 duration-150`}
          >
            {/* Drawer Header */}
            <div className={`flex items-center justify-between border-b p-4 ${t.border}`}>
              <h3 className={`font-serif text-sm font-bold capitalize ${t.text}`}>
                {sidebarTab === "toc" && "Table of Contents"}
                {sidebarTab === "annotations" && "Annotations"}
                {sidebarTab === "vocabulary" && "Private Vocabulary"}
              </h3>
              <button
                type="button"
                onClick={() => setSidebarTab(null)}
                aria-label="Close panel"
                className={`rounded-md p-1 text-xs ${t.subtle} hover:${t.text} ${t.hoverBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700`}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Storage Warning */}
            {storageUnavailable && (
              <div className="flex items-start gap-2 border-b border-amber-400/40 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
                  Browser storage is unavailable. Annotations will not be saved between sessions.
                </p>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-hidden">
              {/* Table of Contents */}
              {sidebarTab === "toc" && (
                <div className="flex flex-col gap-1.5 overflow-y-auto p-4 h-full">
                  <p className={`mb-2 text-[11px] ${t.subtle}`}>
                    Click any chapter to jump smoothly within the complete volume:
                  </p>
                  {book.chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => scrollToChapter(idx)}
                      className={`flex items-start justify-between rounded-md p-2.5 text-left text-xs transition-colors ${
                        idx === activeChapterIndex
                          ? `${t.activeBg} font-bold shadow-xs`
                          : `${t.text} ${t.hoverBg}`
                      }`}
                    >
                      <span className="line-clamp-2">{ch.title}</span>
                      <span className={`font-mono text-[10px] ${t.subtle}`}>§ {idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Annotations Panel */}
              {sidebarTab === "annotations" && (
                <AnnotationsPanel
                  bookId={book.id}
                  bookmarks={bookmarks}
                  highlights={highlights}
                  quotes={quotes}
                  activeTab={annotationsTab}
                  onTabChange={setAnnotationsTab}
                  onBookmarksChange={reloadBookmarks}
                  onHighlightsChange={reloadHighlights}
                  onQuotesChange={reloadQuotes}
                  onNavigateToChapter={(idx) => { scrollToChapter(idx); setSidebarTab(null); }}
                  onDeleteBookmarkRequest={(id) => setBookmarkToDelete(id)}
                  theme={prefs.theme}
                />
              )}

              {/* Private Vocabulary */}
              {sidebarTab === "vocabulary" && (
                <div className="h-full overflow-y-auto p-3">
                  <VocabularySection
                    vocabulary={vocabulary}
                    onVocabularyChange={reloadVocabulary}
                    theme={prefs.theme}
                    bookTitle={book.metadata.title}
                  />
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bookmark Delete Confirmation Dialog ─────────────── */}
      {bookmarkToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-bm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl ${t.surface} ${t.border} ${t.text}`}
          >
            <h4 id="del-bm-title" className={`font-serif text-sm font-bold ${t.text}`}>
              Delete bookmark?
            </h4>
            <p className={`mt-1.5 text-xs leading-relaxed ${t.subtle}`}>
              This will permanently remove the bookmark. This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={handleConfirmDeleteBookmark}
                className="flex-1 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete bookmark
              </button>
              <button
                type="button"
                onClick={() => setBookmarkToDelete(null)}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold ${t.border} ${t.text} hover:opacity-80 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Display Settings Popover (Theme Preview Grid & High-Contrast Options) ── */}
      {settingsOpen && (
        <div
          className={`absolute right-4 top-16 z-40 w-72 rounded-lg border p-5 shadow-2xl ${t.surface} ${t.border} ${t.text} flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className={`flex items-center justify-between border-b pb-2.5 ${t.border}`}>
            <h4 className={`font-serif text-xs font-bold uppercase tracking-wider ${t.text}`}>
              Reader Display
            </h4>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className={`text-xs ${t.subtle} hover:${t.text}`}
            >
              ✕
            </button>
          </div>

          {/* Theme Palette with High-Contrast Explicit Colors */}
          <div>
            <label className={`text-[11px] font-semibold ${t.subtle}`}>Reading Theme</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {THEME_OPTIONS.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    const updated = { ...prefs, theme: th.id as ReaderPreferences["theme"] };
                    setPrefs(updated);
                    savePreferences(updated);
                  }}
                  className={`flex flex-col items-center justify-center rounded-md border p-2 text-xs font-semibold shadow-2xs transition-all ${
                    th.bg
                  } ${th.border} ${
                    prefs.theme === th.id
                      ? "ring-2 ring-emerald-600 ring-offset-1 scale-[1.03]"
                      : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <span className={`${th.text}`}>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <label className={`text-[11px] font-semibold ${t.subtle}`}>Typography</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: "serif", label: "Serif", font: "font-serif" },
                { id: "sans", label: "Sans", font: "font-sans" },
                { id: "mono", label: "Mono", font: "font-mono" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const updated = { ...prefs, fontFamily: f.id as ReaderPreferences["fontFamily"] };
                    setPrefs(updated);
                    savePreferences(updated);
                  }}
                  className={`rounded-md border p-1.5 text-xs font-medium transition-all ${f.font} ${
                    prefs.fontFamily === f.id
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : `${t.border} ${t.controlBg} ${t.text} hover:opacity-80`
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className={t.subtle}>Font Size</span>
              <span className={`font-mono tabular-nums ${t.text}`}>{prefs.fontSize}px</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs, fontSize: Math.max(14, prefs.fontSize - 2) };
                  setPrefs(updated);
                  savePreferences(updated);
                }}
                className={`flex-1 rounded-md border ${t.border} ${t.controlBg} ${t.text} py-1.5 text-xs font-bold shadow-2xs hover:opacity-80 active:scale-[0.98]`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs, fontSize: Math.min(28, prefs.fontSize + 2) };
                  setPrefs(updated);
                  savePreferences(updated);
                }}
                className={`flex-1 rounded-md border ${t.border} ${t.controlBg} ${t.text} py-1.5 text-xs font-bold shadow-2xs hover:opacity-80 active:scale-[0.98]`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Page Width */}
          <div>
            <label className={`text-[11px] font-semibold ${t.subtle}`}>Page Width</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: "sm", label: "Focused" },
                { id: "md", label: "Standard" },
                { id: "lg", label: "Expansive" },
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    const updated = { ...prefs, contentWidth: w.id as ReaderPreferences["contentWidth"] };
                    setPrefs(updated);
                    savePreferences(updated);
                  }}
                  className={`rounded-md border p-1.5 text-[11px] font-medium transition-all ${
                    prefs.contentWidth === w.id
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : `${t.border} ${t.controlBg} ${t.text} hover:opacity-80`
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Selection Toolbar (Highlight, Note, Quote, Define) ── */}
      {selectionRange && selectionRange.rect && (
        <div
          role="toolbar"
          aria-label="Text selection tools"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed z-50 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-800/95 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: `${Math.max(10, selectionRange.rect.top - 46)}px`,
            left: `${Math.max(10, Math.min(1000, selectionRange.rect.left + selectionRange.rect.width / 2 - 130))}px`,
          }}
        >
          {/* 1. Highlight Colors */}
          <div className="flex items-center gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleApplyHighlight(c.name)}
                title={`Highlight in ${c.label}`}
                aria-label={`Highlight in ${c.label}`}
                className={`size-4.5 rounded-full ${c.badgeClass} shadow-2xs transition-transform hover:scale-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />

          {/* 2. Add Note */}
          <button
            type="button"
            onClick={() => {
              setPendingColor("amber");
              setShowNoteModal(true);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            <span>Add Note</span>
          </button>

          {/* 3. Save Quote */}
          <button
            type="button"
            onClick={handleSaveQuote}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Quote className="size-3.5" aria-hidden="true" />
            <span>Save Quote</span>
          </button>

          {/* 4. Define Word */}
          <button
            type="button"
            onClick={() => {
              const wordToLookup = selectionRange.cleanWord || selectionRange.text.trim().split(/\s+/)[0];
              setSelectedWordForDefinition(wordToLookup);
              setIsDefinitionOpen(true);
              setSelectionRange(null);
            }}
            className="flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            <span>Define Word</span>
          </button>
        </div>
      )}

      {/* ── Add Note Modal ──────────────────────────────────────── */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h4 className="font-serif text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Add Margin Annotation
            </h4>
            <p className="mt-1 line-clamp-2 text-xs italic text-zinc-500">
              &ldquo;{selectionRange?.text}&rdquo;
            </p>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Record your thought, connection, or question..."
              className="mt-3 w-full rounded-md border border-zinc-300 p-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              rows={3}
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHighlightWithNote}
                className="rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 active:scale-[0.98]"
              >
                Save Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reading Helper: Definition Panel (Bottom Sheet on Mobile, Side Panel on Desktop) ── */}
      <DefinitionPanel
        word={selectedWordForDefinition}
        bookId={book.id}
        bookTitle={book.metadata.title}
        chapterTitle={currentChapter.title}
        chapterIndex={activeChapterIndex}
        isOpen={isDefinitionOpen}
        onClose={() => setIsDefinitionOpen(false)}
        theme={prefs.theme}
        onWordSavedChange={reloadVocabulary}
      />

      {/* ── Bottom Continuous Reading Scrubber & Progress ───────── */}
      <footer
        className={`flex h-11 shrink-0 items-center justify-between border-t px-4 ${t.surface} ${t.border} z-20 text-xs`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[11px] tabular-nums ${t.subtle}`}>
            Current: Section {activeChapterIndex + 1} of {book.totalChapters}
          </span>
          <span className={`hidden sm:inline ${t.subtle}`}>·</span>
          <span className={`hidden sm:inline truncate max-w-xs font-medium ${t.text}`}>
            {currentChapter.title}
          </span>
        </div>

        {/* Global Progress Bar (Whole Book 0% to 100%) */}
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-32 sm:w-48 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full bg-emerald-700 transition-all duration-150 dark:bg-emerald-500"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          <span className={`font-mono text-[11px] font-bold tabular-nums ${t.text}`}>
            {scrollProgress}% read
          </span>
        </div>
      </footer>
    </div>
  );
}
