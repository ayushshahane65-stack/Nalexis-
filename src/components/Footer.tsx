import Link from "next/link";
import { BookOpen } from "lucide-react";

interface FooterSection {
  heading: string;
  links: { label: string; href: string }[];
}

const FOOTER_SECTIONS: FooterSection[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Reading circles", href: "#reading-circles" },
      { label: "Communities", href: "#communities" },
      { label: "Offline reader", href: "/home" },
    ],
  },
  {
    heading: "Library",
    links: [
      { label: "Catalog overview", href: "/home" },
      { label: "My library", href: "/library" },
      { label: "Authors archive", href: "/authors" },
      { label: "Classic literature", href: "/home" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create library", href: "/signup" },
      { label: "Reader dashboard", href: "/home" },
      { label: "Profile settings", href: "/login" },
    ],
  },
  {
    heading: "Legal & Standards",
    links: [
      { label: "Privacy policy", href: "#" },
      { label: "Terms of service", href: "#" },
      { label: "Open EPUB standard", href: "#" },
      { label: "Accessibility statement", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      aria-label="Site footer"
      className="border-t border-[var(--border)] bg-[var(--card)] transition-colors duration-200"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand section */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <BookOpen
                className="size-5 text-[var(--primary)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="font-serif text-xl font-normal tracking-tight text-[var(--text)]">
                nalexis <span className="text-[var(--primary)]">.</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              A calm digital sanctuary for readers. Curate editions, read offline, and connect through literature.
            </p>
          </div>

          {/* Nav columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
                {section.heading}
              </h3>
              <ul className="mt-3.5 flex flex-col gap-2.5" role="list">
                {section.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="rounded-sm text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 text-xs text-[var(--text-subtle)] sm:flex-row">
          <p>© {new Date().getFullYear()} Nalexis. Designed for intentional reading.</p>
          <p>Zero algorithmic advertisements · Open EPUB standards · Respects reader privacy</p>
        </div>
      </div>
    </footer>
  );
}
