import Link from "next/link";
import { BookOpen, AlertCircle } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 transition-colors dark:bg-zinc-950 sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-zinc-950"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white shadow-xs dark:bg-emerald-600">
              <BookOpen className="size-5" aria-hidden="true" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Nalexis
            </span>
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Create your personal library
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create an account to organize your library and join discussions.
          </p>
        </div>

        {/* Card container */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs transition-colors dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <div>
                <p className="font-medium">Registration issue</p>
                <p className="mt-0.5 text-xs text-red-700 dark:text-red-300/90">{decodeURIComponent(error)}</p>
              </div>
            </div>
          )}

          {/* OAuth option */}
          <GoogleAuthButton mode="signup" />

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <span className="relative bg-white px-2 text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Or register with email
            </span>
          </div>

          <form action={signUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="display_name"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full name or reader handle
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Eleanor Vance"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/20"
              />
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-xs transition-all hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900"
            >
              Complete registration
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:text-emerald-400"
            >
              Sign in instead
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="hover:text-zinc-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 dark:hover:text-zinc-200"
          >
            ← Return to library showcase
          </Link>
        </p>
      </div>
    </main>
  );
}
