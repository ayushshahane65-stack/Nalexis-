"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GoogleAuthButtonProps {
  mode?: "signin" | "signup";
  redirectTo?: string;
}

export function GoogleAuthButton({
  mode = "signin",
  redirectTo = "/home",
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const supabase = createClient();

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (redirectTo) {
        callbackUrl.searchParams.set("next", redirectTo);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to connect to Google.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-750 dark:hover:border-zinc-600"
      >
        {loading ? (
          <div className="size-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
        ) : (
          <svg
            className="size-4.5 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.34 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
            />
          </svg>
        )}
        <span>
          {loading
            ? "Redirecting to Google..."
            : mode === "signup"
              ? "Sign up with Google"
              : "Continue with Google"}
        </span>
      </button>

      {errorMessage && (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
