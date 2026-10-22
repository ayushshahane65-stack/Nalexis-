import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";

export default function ReadingCirclesSection() {
  return (
    <section
      id="reading-circles"
      aria-labelledby="reading-circles-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="flex flex-col items-start justify-between gap-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-xs sm:flex-row sm:items-end sm:p-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
            Reading circles
          </p>
          <h2
            id="reading-circles-heading"
            className="mt-2 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
          >
            Read together at a steady pace
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
            Join small reader groups moving through books on a shared weekly rhythm. Share margin reflections and discuss chapters together.
          </p>
        </div>

        <Link
          href="/circles"
          className="group inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-5 py-2.5 text-sm font-medium text-[var(--text)] shadow-xs transition-all duration-150 hover:border-[var(--primary)] hover:bg-[var(--card-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <span>Browse circles</span>
          <ArrowRight className="size-4 text-[var(--text-muted)] transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <hr className="mt-16 border-t border-[var(--border)]" />
    </section>
  );
}
