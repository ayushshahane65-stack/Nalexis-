"use client";

import Image from "next/image";
import { BookOpen, Folder } from "lucide-react";

interface ShelfCollageProps {
  customCover?: string | null;
  bookCovers: Array<string | null>;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function ShelfCollage({
  customCover,
  bookCovers,
  className = "",
  size = "md",
}: ShelfCollageProps) {
  const validCovers = bookCovers.filter((c): c is string => Boolean(c));

  const sizeClasses = {
    sm: "size-16 rounded-xl",
    md: "size-28 sm:size-32 rounded-2xl",
    lg: "size-40 sm:size-48 rounded-2xl",
  }[size];

  if (customCover) {
    return (
      <div className={`relative overflow-hidden border border-[var(--border)] bg-zinc-100 dark:bg-zinc-800 shadow-xs ${sizeClasses} ${className}`}>
        <Image src={customCover} alt="Shelf cover" fill unoptimized className="object-cover" />
      </div>
    );
  }

  if (validCovers.length === 0) {
    return (
      <div className={`flex items-center justify-center border border-[var(--border)] bg-emerald-50/50 text-[var(--primary)] dark:bg-emerald-950/30 ${sizeClasses} ${className}`}>
        <Folder className="size-8 opacity-40" />
      </div>
    );
  }

  if (validCovers.length === 1) {
    return (
      <div className={`relative overflow-hidden border border-[var(--border)] bg-zinc-100 dark:bg-zinc-800 shadow-xs ${sizeClasses} ${className}`}>
        <Image src={validCovers[0]} alt="Shelf cover" fill unoptimized className="object-cover" />
      </div>
    );
  }

  // 2 to 4 covers collage
  const displayCovers = validCovers.slice(0, 4);

  return (
    <div className={`relative grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden border border-[var(--border)] bg-zinc-200 dark:bg-zinc-800 shadow-xs ${sizeClasses} ${className}`}>
      {displayCovers.map((cover, i) => (
        <div key={i} className="relative size-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <Image src={cover} alt="" fill unoptimized className="object-cover" />
        </div>
      ))}
      {displayCovers.length < 4 &&
        Array.from({ length: 4 - displayCovers.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex size-full items-center justify-center bg-zinc-100/60 dark:bg-zinc-800/60">
            <BookOpen className="size-3.5 opacity-25" />
          </div>
        ))}
    </div>
  );
}
