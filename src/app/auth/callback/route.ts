import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync Google metadata to user profile if available
      try {
        const metadata = data.user.user_metadata;
        const displayName =
          metadata?.full_name || metadata?.name || metadata?.display_name || data.user.email?.split("@")[0];
        const avatarUrl = metadata?.avatar_url || metadata?.picture;

        await (supabase.from("profiles") as any)
          .upsert(
            {
              id: data.user.id,
              display_name: displayName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      } catch (profileErr) {
        // Non-blocking: profile trigger or existing record will keep working
        console.warn("Failed to sync profile from Google auth metadata:", profileErr);
      }

      // Safe redirect validation: ensure 'next' is an internal path
      const isInternalPath = next.startsWith("/") && !next.startsWith("//");
      const targetUrl = isInternalPath ? `${origin}${next}` : `${origin}/home`;
      return NextResponse.redirect(targetUrl);
    }

    if (error) {
      console.error("Supabase OAuth code exchange error:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Authentication cancelled or invalid code received.")}`
  );
}
