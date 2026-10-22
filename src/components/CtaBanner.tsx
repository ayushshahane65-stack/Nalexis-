import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";

export default function CtaBanner() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center shadow-xs sm:px-12 sm:py-16">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] dark:text-[var(--eyebrow)]">
          <BookOpen className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </div>

        <h2
          id="cta-heading"
          className="mt-5 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
        >
          Your library is ready when you are
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
          Begin organizing your collection, exploring open access volumes, and reading in a calm, ad-free environment.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
          <Link
            href="/home"
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-xs transition-all duration-150 hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:w-auto"
          >
            <span>Enter library dashboard</span>
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 py-2.5 text-sm font-medium text-[var(--text)] shadow-xs transition-all duration-150 hover:bg-[var(--card-hover)] hover:border-[var(--primary)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:w-auto"
          >
            <ShieldCheck className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
            <span>Sign in to account</span>
          </Link>
        </div>

        <p className="mt-8 text-xs text-[var(--text-subtle)]">
          Zero algorithmic advertisements · Open EPUB standards · Respects reader privacy
        </p>
      </div>
    </section>
  );
}
