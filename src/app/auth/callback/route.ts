import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const errorParam =
    searchParams.get("error_description") ||
    searchParams.get("error") ||
    searchParams.get("message");

  // 1. If Google or Supabase passed an explicit error in the query parameters
  if (errorParam) {
    console.error("Supabase OAuth callback returned error:", errorParam);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    );
  }

  // 2. PKCE code exchange
  if (code) {
    try {
      const supabase = await createClient();
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Sync Google metadata to user profile if available
        try {
          const metadata = data.user.user_metadata;
          const displayName =
            metadata?.full_name ||
            metadata?.name ||
            metadata?.display_name ||
            data.user.email?.split("@")[0];
          const avatarUrl = metadata?.avatar_url || metadata?.picture;

          await (supabase.from("profiles") as any).upsert(
            {
              id: data.user.id,
              display_name: displayName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("Failed to sync profile from Google auth metadata:", profileErr);
        }

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
    } catch (exchangeErr: unknown) {
      const message =
        exchangeErr instanceof Error
          ? exchangeErr.message
          : "Unexpected error during session exchange.";
      console.error("OAuth exception:", message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(message)}`
      );
    }
  }

  // 3. If neither code nor error was in query params, check if tokens arrived in URL hash (Implicit grant flow)
  // Browsers do NOT send URL hashes to servers, so we render a tiny client-side script to handle hash
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Authenticating...</title>
  </head>
  <body style="background:#09090b;color:#e4e4e7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;">
      <p style="font-size:16px;">Completing sign in...</p>
    </div>
    <script>
      (function() {
        var hash = window.location.hash;
        if (hash) {
          var params = new URLSearchParams(hash.substring(1));
          var error = params.get('error_description') || params.get('error');
          if (error) {
            window.location.replace('/login?error=' + encodeURIComponent(error));
            return;
          }
          if (params.get('access_token')) {
            // Token received in hash: redirect to home
            window.location.replace('${next || "/home"}');
            return;
          }
        }
        window.location.replace('/login?error=' + encodeURIComponent('No authorization code was returned by Google or Supabase.'));
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
