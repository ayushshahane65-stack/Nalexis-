import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden border-b border-[var(--border)] bg-[#1A1612]"
    >
      {/* Background photographic banner with warm dark overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-reading.jpg"
          alt="Vintage books stacked on a wooden reading desk illuminated by warm window sunlight"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45"
        />
        {/* Warm vignette & gradient overlays */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#14110E]/95 via-[#14110E]/80 to-[#14110E]/60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#14110E] via-transparent to-black/30"
          aria-hidden="true"
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="max-w-2xl text-left">
          {/* Small UPPERCASE green/cream eyebrow with wide letter spacing */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3E0BA] dark:text-[#5AB97E]">
            Your reading space
          </p>

          {/* Large elegant serif headline */}
          <h1
            id="hero-heading"
            className="mt-4 font-serif text-4xl font-normal tracking-tight text-[#FAF7F2] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]"
          >
            A place to stay with a story.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-[#D6CEBF] sm:text-lg">
            Find your next great read, keep track of the ones you love, and talk about what stays with you.
          </p>

          {/* Primary CTA button: Cream button with arrow */}
          <div className="mt-8 flex items-center">
            <Link
              href="#handpicked-stories"
              className="group inline-flex items-center gap-2 rounded-lg bg-[#FDFAF5] px-6 py-3 text-sm font-medium text-[#1F2421] shadow-sm transition-all duration-150 hover:bg-white hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              <span>Explore the books</span>
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
