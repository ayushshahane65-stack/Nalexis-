"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Compass,
  Library,
  UsersRound,
  Users,
  PenTool,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Compass, label: "Discover", href: "/discover" },
  { icon: Library, label: "My Library", href: "/library" },
  { icon: BookOpen, label: "On Device", href: "/read" },
  { icon: UsersRound, label: "Reading Circles", href: "/circles" },
  { icon: Users, label: "Communities", href: "/communities" },
  { icon: PenTool, label: "Authors", href: "/authors" },
];

const UTILITY_NAV_ITEMS: NavItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: User, label: "Profile", href: "/profile" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 transition-colors dark:bg-zinc-950">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        aria-label="Main application navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200 bg-white transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900 ${
          collapsed ? "w-16" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* App brand header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            href="/home"
            className={`flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
              collapsed ? "w-full justify-center" : ""
            }`}
            aria-label={collapsed ? "Nalexis home" : undefined}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white dark:bg-emerald-600">
              <BookOpen className="size-4.5" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="font-serif text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Nalexis
              </span>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:flex"
            aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
          >
            {collapsed ? (
              <ChevronRight className="size-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <nav aria-label="Primary navigation sections">
            <ul className="flex flex-col gap-1" role="list">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
                        isActive
                          ? "bg-emerald-700 text-white shadow-xs dark:bg-emerald-600"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom utility & sign out */}
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <ul className="flex flex-col gap-1" role="list">
              {UTILITY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:focus-visible:ring-emerald-400 ${
                        isActive
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}

              <li>
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    title={collapsed ? "Sign out" : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-all hover:bg-red-50 hover:text-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 ${
                      collapsed ? "justify-center px-0" : ""
                    }`}
                  >
                    <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span>Sign out</span>}
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main app viewport */}
      <div className={`flex flex-1 flex-col transition-all duration-200 ${collapsed ? "md:pl-16" : "md:pl-64"}`}>
        {/* Mobile top header bar */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <Link href="/home" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-emerald-700 text-white dark:bg-emerald-600">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            <span className="font-serif text-base font-bold text-zinc-900 dark:text-zinc-100">
              Nalexis
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </header>

        {/* Main page content area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
