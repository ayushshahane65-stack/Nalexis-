"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { parseEpubFile } from "@/lib/epub/parser";
import { saveUserBookAsync } from "@/lib/epub/storage";
import type { ParsedEpub } from "@/lib/epub/types";

interface EpubUploaderProps {
  existingBooks: ParsedEpub[];
  onBookUploaded: (book: ParsedEpub) => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export default function EpubUploader({ existingBooks, onBookUploaded }: EpubUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setSuccessMessage(null);

    // 1. Validate file extension
    const isEpub =
      file.name.toLowerCase().endsWith(".epub") ||
      file.type === "application/epub+zip";

    if (!isEpub) {
      setError("Not a valid EPUB");
      return;
    }

    // 2. Validate file size (50 MB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File too large");
      return;
    }

    setIsLoading(true);

    try {
      // 3. Parse EPUB metadata, chapters & cover
      const parsed = await parseEpubFile(file);

      // 4. Duplicate prevention (same title + author + file size)
      const isDuplicate = existingBooks.some(
        (b) =>
          b.metadata.title.trim().toLowerCase() === parsed.metadata.title.trim().toLowerCase() &&
          b.metadata.creator.trim().toLowerCase() === parsed.metadata.creator.trim().toLowerCase() &&
          b.fileSize === file.size
      );

      if (isDuplicate) {
        setError("This book is already in your library.");
        setIsLoading(false);
        return;
      }

      // 5. Save to private IndexedDB
      await saveUserBookAsync(parsed, file);

      setSuccessMessage(`"${parsed.metadata.title}" added to your on-device library.`);
      onBookUploaded(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("protected")) {
        setError("This book is protected and can't be opened here.");
      } else if (msg.includes("Invalid") || msg.includes("Not a valid")) {
        setError("Not a valid EPUB");
      } else {
        setError(msg || "Could not process this EPUB file.");
      }
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        onChange={handleFileInputChange}
        className="hidden"
        id="epub-file-input"
        aria-label="Upload EPUB file"
      />

      {/* Drag & drop upload box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer sm:p-8 ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/10 scale-[1.01]"
            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--card)]/80"
        } ${isLoading ? "pointer-events-none opacity-80" : ""}`}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] shadow-xs">
          {isLoading ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <Upload className="size-7" />
          )}
        </div>

        <h3 className="mt-4 font-serif text-lg font-semibold text-[var(--text)]">
          {isLoading ? "Reading EPUB & storing privately..." : "Upload your EPUB"}
        </h3>

        <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
          Drag and drop your book file here, or click to browse from your device.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 border border-[var(--border)]">
            .epub only
          </span>
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 border border-[var(--border)]">
            Up to 50 MB
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[var(--primary)] font-medium">
            <ShieldCheck className="size-3" /> Stays on your device
          </span>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-[var(--primary-foreground)] shadow-xs transition-colors hover:bg-[var(--primary)]/90 active:scale-95"
        >
          <FileUp className="size-4" />
          <span>Upload EPUB</span>
        </button>
      </div>

      {/* Error Feedback */}
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Feedback */}
      {successMessage && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="font-medium">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
