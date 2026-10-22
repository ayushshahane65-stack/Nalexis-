import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

export default function CommunitiesSection() {
  return (
    <section
      id="communities"
      aria-labelledby="communities-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--primary)] dark:text-[var(--eyebrow)] shadow-xs">
          <Compass className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
          Literary Tradition &amp; Focus
        </p>

        <h2
          id="communities-heading"
          className="mt-2 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
        >
          Reader-led communities
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          Engage in long-form, thoughtful discussion rooms arranged by literary tradition and subject matter rather than algorithmic popularity.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href="/communities"
            className="group inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-xs transition-all duration-150 hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            <span>Browse communities</span>
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <hr className="mt-16 border-t border-[var(--border)]" />
    </section>
  );
}
