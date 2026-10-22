"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  matchPattern?: RegExp;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", matchPattern: /^\/(home)?$/ },
  { label: "Explore", href: "/discover", matchPattern: /^\/discover/ },
  { label: "Communities", href: "/communities", matchPattern: /^\/communities/ },
  { label: "Library", href: "/library", matchPattern: /^\/library/ },
  { label: "Profile", href: "/profile", matchPattern: /^\/profile/ },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLinkActive = (item: NavItem) => {
    if (item.matchPattern) {
      return item.matchPattern.test(pathname);
    }
    return pathname === item.href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md transition-colors duration-200">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Brand Logo: Open book icon + serif "nalexis ." */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label="Nalexis home"
        >
          <BookOpen
            className="size-5 text-[var(--primary)] transition-transform duration-200 group-hover:scale-105"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="font-serif text-2xl font-normal tracking-tight text-[var(--text)]">
            nalexis <span className="text-[var(--primary)]">.</span>
          </span>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <ul className="hidden items-center gap-8 md:flex" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isLinkActive(item);
            return (
              <li key={item.label} className="relative">
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-150 py-1 ${
                    active
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[var(--primary)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right: Search, Sun/Moon Theme Toggle, Outlined "Reading circles ↗" button */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Search Icon button */}
          <Link
            href="/discover"
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--card)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Search books"
            title="Search books"
          >
            <Search className="size-4.5" strokeWidth={1.8} aria-hidden="true" />
          </Link>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Outlined Action Button */}
          <Link
            href="/circles"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-xs font-medium text-[var(--text)] shadow-xs transition-all duration-150 hover:border-[var(--primary)] hover:bg-[var(--card-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <span>Reading circles</span>
            <ArrowUpRight className="size-3.5 text-[var(--text-muted)]" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile controls: Theme toggle + Menu burger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] transition-colors hover:bg-[var(--card-hover)] active:scale-95"
          >
            {mobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-5 shadow-lg md:hidden">
          <ul className="flex flex-col gap-2" role="list">
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[var(--primary-subtle)] text-[var(--primary)] font-semibold"
                        : "text-[var(--text)] hover:bg-[var(--background)]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="size-1.5 rounded-full bg-[var(--primary)]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
            <Link
              href="/discover"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--card-hover)]"
            >
              <Search className="size-4" />
              <span>Search books</span>
            </Link>
            <Link
              href="/circles"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)]"
            >
              <span>Reading circles</span>
              <ArrowUpRight className="size-3.5 text-[var(--text-muted)]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
