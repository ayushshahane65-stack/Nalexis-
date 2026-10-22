import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_ADMIN_COOKIE, verifyLocalAdminSession } from "@/lib/local-admin-session";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let authenticated = await verifyLocalAdminSession(request.cookies.get(LOCAL_ADMIN_COOKIE)?.value);
  if (!authenticated && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value),
              );
              supabaseResponse = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
              );
            },
          },
        },
      );

      const { data } = await supabase.auth.getUser();
      authenticated = Boolean(data?.user);
    } catch {
      // Supabase unavailable or DNS failure — handled safely
    }
  }

  // Protected routes — redirect to /login if not authenticated
  const protectedPaths = [
    "/home", "/library", "/circles", "/communities", "/authors", "/book",
  ];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged-in user hits /login or /signup, send them to /home
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (isAuthPage && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
