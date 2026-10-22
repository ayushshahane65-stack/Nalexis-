"use client";

import { useState } from "react";
import {
  Bookmark,
  Trash2,
  Search,
  X,
} from "lucide-react";
import type { SavedVocabularyWord } from "@/lib/epub/types";
import { deleteVocabularyWord } from "@/lib/epub/storage";

interface VocabularySectionProps {
  vocabulary: SavedVocabularyWord[];
  onVocabularyChange: () => void;
  theme?: "light" | "sepia" | "dark" | "oled";
  bookTitle?: string;
}

export default function VocabularySection({
  vocabulary,
  onVocabularyChange,
  theme = "light",
  bookTitle,
}: VocabularySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBookOnly, setFilterBookOnly] = useState(false);

  const isDark = theme === "dark" || theme === "oled";
  const isSepia = theme === "sepia";

  const subtleText = isDark
    ? "text-zinc-400"
    : isSepia
    ? "text-[#6e553f]"
    : "text-zinc-600";

  const cardBorder = isDark
    ? "border-zinc-800 bg-zinc-900/60"
    : isSepia
    ? "border-[#d8c09a] bg-[#fbf0d9]/80"
    : "border-zinc-200 bg-white";

  const badgeBg = isDark
    ? "bg-zinc-800 text-zinc-300 border-zinc-700"
    : isSepia
    ? "bg-[#ebd3ab] text-[#2d241e] border-[#d8c09a]"
    : "bg-zinc-100 text-zinc-700 border-zinc-200";

  const filteredWords = vocabulary.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.chapterTitle && w.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterBookOnly && bookTitle) {
      return matchesSearch && w.bookTitle === bookTitle;
    }
    return matchesSearch;
  });

  const handleDelete = (id: string) => {
    deleteVocabularyWord(id);
    onVocabularyChange();
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search & Filter Header */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400" />
          <input
            type="search"
            placeholder="Search saved vocabulary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-md border pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700 ${
              isDark
                ? "border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                : isSepia
                ? "border-[#d8c09a] bg-[#fbf0d9] text-[#2d241e] placeholder:text-[#8a725b]"
                : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400"
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {bookTitle && (
          <div className="flex items-center justify-between text-[11px]">
            <span className={subtleText}>
              <strong className="font-mono tabular-nums">{filteredWords.length}</strong>{" "}
              {filteredWords.length === 1 ? "word" : "words"}
            </span>

            <button
              type="button"
              onClick={() => setFilterBookOnly(!filterBookOnly)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                filterBookOnly
                  ? "bg-emerald-700 text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {filterBookOnly ? "This volume only" : "All volumes"}
            </button>
          </div>
        )}
      </div>

      {/* Vocabulary List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-zinc-300 dark:border-zinc-800">
            <Bookmark className="size-6 text-zinc-400 mb-2" />
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {searchQuery ? "No matching words found" : "No saved words yet"}
            </p>
            <p className={`mt-1 text-[11px] max-w-xs ${subtleText}`}>
              {searchQuery
                ? "Try searching for another word or clear the filter."
                : "Select any difficult word in the text and tap 'Define Word' to save it to your private vocabulary notebook."}
            </p>
          </div>
        ) : (
          filteredWords.map((item) => (
            <article
              key={item.id}
              className={`rounded-lg border p-3 shadow-2xs transition-colors ${cardBorder}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-sm font-bold capitalize">
                      {item.word}
                    </h4>
                    <span className={`rounded border px-1.5 py-0.2 text-[9px] font-semibold uppercase ${badgeBg}`}>
                      {item.partOfSpeech}
                    </span>
                  </div>

                  {item.phonetic && (
                    <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {item.phonetic}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  title="Remove from vocabulary"
                  aria-label={`Remove ${item.word} from vocabulary`}
                  className="rounded p-1 text-zinc-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Definition text */}
              <p className="mt-1.5 text-xs font-serif leading-relaxed line-clamp-3">
                {item.definition}
              </p>

              {/* Example if present */}
              {item.example && (
                <p className={`mt-1 text-[11px] italic line-clamp-2 ${subtleText}`}>
                  &ldquo;{item.example}&rdquo;
                </p>
              )}

              {/* Source & Date */}
              <div className={`mt-2 flex items-center justify-between border-t pt-1.5 text-[10px] ${
                isDark ? "border-zinc-800" : isSepia ? "border-[#dec8a0]" : "border-zinc-100"
              } ${subtleText}`}>
                <span className="truncate max-w-[170px]" title={`${item.bookTitle} · ${item.chapterTitle}`}>
                  {item.chapterTitle || "Chapter"}
                </span>
                <span className="font-mono tabular-nums">{item.savedAt}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
