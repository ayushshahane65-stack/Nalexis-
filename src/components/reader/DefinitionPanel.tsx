"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  BookmarkCheck,
  Bookmark,
  Volume2,
  AlertCircle,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import type { WordDefinition, SavedVocabularyWord } from "@/lib/epub/types";
import {
  getCachedDefinition,
  setCachedDefinition,
  getSavedVocabulary,
  saveVocabularyWord,
  deleteVocabularyWord,
} from "@/lib/epub/storage";

interface DefinitionPanelProps {
  word: string;
  bookId: string;
  bookTitle: string;
  chapterTitle?: string;
  chapterIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "sepia" | "dark" | "oled";
  onWordSavedChange?: () => void;
}

export default function DefinitionPanel({
  word,
  bookId,
  bookTitle,
  chapterTitle,
  chapterIndex,
  isOpen,
  onClose,
  theme = "light",
  onWordSavedChange,
}: DefinitionPanelProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedSuccessFlash, setSavedSuccessFlash] = useState<boolean>(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Check whether this word is already saved in reader's private vocabulary
  const [retryKey, setRetryKey] = useState(0);

  // Check whether this word is already saved in reader's private vocabulary
  const checkIsSaved = useCallback(
    (targetWord: string) => {
      const list = getSavedVocabulary(bookId);
      return list.some((item) => item.word.toLowerCase() === targetWord.toLowerCase());
    },
    [bookId]
  );

  useEffect(() => {
    if (!isOpen || !word) return;

    let isMounted = true;
    const clean = word
      .replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "")
      .trim()
      .toLowerCase();

    if (!clean) {
      requestAnimationFrame(() => {
        if (isMounted) {
          setStatus("error");
          setErrorMessage("Please select a valid English word.");
        }
      });
      return;
    }

    // 1. Check local cache first for zero-latency retrieval
    const cached = getCachedDefinition(clean);
    if (cached) {
      requestAnimationFrame(() => {
        if (isMounted) {
          setDefinition(cached);
          setStatus("success");
          setIsSaved(checkIsSaved(clean));
        }
      });
    } else {
      requestAnimationFrame(() => {
        if (isMounted) {
          setStatus("loading");
          setErrorMessage("");
        }
      });

      fetch(`/api/dictionary?word=${encodeURIComponent(clean)}`)
        .then(async (res) => {
          if (!isMounted) return;
          const data = await res.json();
          if (!res.ok) {
            setStatus("error");
            setErrorMessage(
              data.error || `No definition found for "${clean}". Check spelling or select another word.`
            );
            return;
          }
          const wordDef: WordDefinition = data;
          setDefinition(wordDef);
          setStatus("success");
          setCachedDefinition(wordDef);
          setIsSaved(checkIsSaved(clean));
        })
        .catch(() => {
          if (!isMounted) return;
          setStatus("error");
          setErrorMessage("Unable to fetch definition. Please check your internet connection.");
        });
    }

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, word, retryKey, checkIsSaved]);

  // Handle keyboard: Escape key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle saving to private vocabulary
  const handleToggleSave = () => {
    if (!definition) return;
    const cleanWord = definition.word.toLowerCase();

    if (isSaved) {
      // Remove from vocabulary
      const list = getSavedVocabulary(bookId);
      const match = list.find((w) => w.word.toLowerCase() === cleanWord);
      if (match) {
        deleteVocabularyWord(match.id);
      }
      setIsSaved(false);
    } else {
      // Save to vocabulary
      const newEntry: SavedVocabularyWord = {
        id: `vocab-${Date.now()}`,
        word: definition.word,
        definition: definition.definition,
        partOfSpeech: definition.partOfSpeech,
        phonetic: definition.phonetic,
        example: definition.example,
        synonyms: definition.synonyms,
        bookId,
        bookTitle,
        chapterTitle: chapterTitle || "Chapter",
        chapterIndex: chapterIndex ?? 0,
        savedAt: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
      saveVocabularyWord(newEntry);
      setIsSaved(true);
      setSavedSuccessFlash(true);
      setTimeout(() => setSavedSuccessFlash(false), 2000);
    }

    onWordSavedChange?.();
  };

  // Play audio pronunciation if available
  const handlePlayAudio = () => {
    if (definition?.audioUrl) {
      const audio = new Audio(definition.audioUrl);
      audio.play().catch(() => {});
    }
  };

  if (!isOpen) return null;

  // Adaptive styles matching reader theme
  const isDark = theme === "dark" || theme === "oled";
  const isSepia = theme === "sepia";

  const themeClasses = isDark
    ? "bg-zinc-900 border-zinc-800 text-zinc-100"
    : isSepia
    ? "bg-[#fbf0d9] border-[#d8c09a] text-[#2d241e]"
    : "bg-white border-zinc-200 text-zinc-900";

  const subtleText = isDark
    ? "text-zinc-400"
    : isSepia
    ? "text-[#6e553f]"
    : "text-zinc-600";

  const badgeBg = isDark
    ? "bg-zinc-800 text-zinc-300 border-zinc-700"
    : isSepia
    ? "bg-[#ebd3ab] text-[#2d241e] border-[#d8c09a]"
    : "bg-zinc-100 text-zinc-700 border-zinc-200";

  return (
    <>
      {/* Backdrop overlay for focus containment */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs md:bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 
        Responsive Container:
        - Mobile: Bottom Sheet (fixed bottom-0 inset-x-0 rounded-t-2xl max-h-[85vh])
        - Desktop: Slide-over Side Dialog / Panel (fixed top-14 right-4 bottom-14 w-96 rounded-xl shadow-2xl)
      */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-word-heading"
        aria-describedby="definition-text"
        className={`fixed z-50 flex flex-col border shadow-2xl transition-all duration-200 ${themeClasses}
          bottom-0 inset-x-0 max-h-[85vh] rounded-t-2xl md:bottom-14 md:top-16 md:right-4 md:left-auto md:w-96 md:max-h-none md:rounded-xl overflow-hidden`}
      >
        {/* Header Bar */}
        <div className={`flex h-13 shrink-0 items-center justify-between border-b px-5 py-3 ${
          isDark ? "border-zinc-800" : isSepia ? "border-[#dec8a0]" : "border-zinc-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-emerald-700 text-white dark:bg-emerald-600">
              <BookOpen className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-serif text-xs font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
              Reading Helper
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close definition panel"
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. LOADING SKELETON (Matches AGENTS.md 4-state contract) */}
          {status === "loading" && (
            <div aria-busy="true" aria-live="polite" className="space-y-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-7 w-36 rounded bg-zinc-300 dark:bg-zinc-700" />
                <div className="flex gap-2">
                  <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-14 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-14 w-full rounded-md bg-zinc-100 dark:bg-zinc-800/60" />
            </div>
          )}

          {/* 2. ERROR STATE (Retryable, plain language per AGENTS.md) */}
          {status === "error" && (
            <div role="alert" className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold">Definition Unavailable</h3>
                <p className={`mt-1 text-xs max-w-xs ${subtleText}`}>
                  {errorMessage || `Could not find definition for "${word}".`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <RotateCcw className="size-3" />
                <span>Retry lookup</span>
              </button>
            </div>
          )}

          {/* 3. SUCCESS DEFINITION CONTENT */}
          {status === "success" && definition && (
            <div className="space-y-4">
              {/* Word & Pronunciation */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2
                    id="definition-word-heading"
                    className="font-serif text-2xl font-bold tracking-tight capitalize"
                  >
                    {definition.word}
                  </h2>

                  {definition.audioUrl && (
                    <button
                      type="button"
                      onClick={handlePlayAudio}
                      title="Listen to pronunciation"
                      aria-label={`Pronounce ${definition.word}`}
                      className="rounded-full p-1.5 text-emerald-700 hover:bg-emerald-100/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                      <Volume2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Phonetic & Part of Speech Pills */}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {definition.phonetic && (
                    <span className="font-mono text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {definition.phonetic}
                    </span>
                  )}
                  <span className={`rounded border px-2 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${badgeBg}`}>
                    {definition.partOfSpeech}
                  </span>
                </div>
              </div>

              {/* Primary Definition */}
              <div className="border-t pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Primary Definition
                </span>
                <p id="definition-text" className="mt-1.5 font-serif text-sm leading-relaxed">
                  {definition.definition}
                </p>
              </div>

              {/* Example Sentence */}
              {definition.example && (
                <div className={`rounded-md border p-3 text-xs italic leading-relaxed ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/60 text-zinc-300"
                    : isSepia
                    ? "border-[#d8c09a] bg-[#f4e4c3]/60 text-[#2d241e]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700"
                }`}>
                  <p>&ldquo;{definition.example}&rdquo;</p>
                </div>
              )}

              {/* Synonyms */}
              {definition.synonyms && definition.synonyms.length > 0 && (
                <div>
                  <span className={`text-[11px] font-semibold ${subtleText}`}>
                    Synonyms
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {definition.synonyms.map((syn) => (
                      <span
                        key={syn}
                        className={`rounded-md border px-2 py-0.5 text-xs ${badgeBg}`}
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Encountered Context Reference */}
              <div className={`border-t pt-3 text-[11px] ${subtleText}`}>
                <p className="truncate">
                  Selected in <strong className="font-semibold">{chapterTitle || "Chapter"}</strong> of{" "}
                  <em>{bookTitle}</em>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex shrink-0 items-center justify-between border-t p-4 gap-2 ${
          isDark ? "border-zinc-800 bg-zinc-900" : isSepia ? "border-[#dec8a0] bg-[#fbf0d9]" : "border-zinc-200 bg-white"
        }`}>
          {/* Save to Vocabulary Button */}
          <button
            type="button"
            disabled={status !== "success"}
            onClick={handleToggleSave}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50 ${
              isSaved
                ? "border border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{savedSuccessFlash ? "Added to Vocabulary!" : "Saved in Vocabulary"}</span>
              </>
            ) : (
              <>
                <Bookmark className="size-3.5" />
                <span>Save to Vocabulary</span>
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-3.5 py-2 text-xs font-medium transition-colors hover:opacity-80 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
              isDark
                ? "border-zinc-700 bg-zinc-800 text-zinc-200"
                : isSepia
                ? "border-[#dec8a0] bg-[#f4e4c3] text-[#2d241e]"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
