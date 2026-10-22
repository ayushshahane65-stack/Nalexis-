"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={`inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] opacity-60 transition-all ${className}`}
        aria-label="Toggle light or dark theme"
        disabled
      >
        <Sun className="size-4.5" aria-hidden="true" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] shadow-xs transition-all duration-200 hover:border-[var(--primary)] hover:bg-[var(--card-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="size-4.5 text-amber-400 transition-transform duration-200 rotate-0" aria-hidden="true" />
      ) : (
        <Moon className="size-4.5 text-[var(--text)] transition-transform duration-200 rotate-0" aria-hidden="true" />
      )}
    </button>
  );
}
