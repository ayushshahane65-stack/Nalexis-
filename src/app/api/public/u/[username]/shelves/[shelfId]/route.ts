/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ username: string; shelfId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { username, shelfId } = await params;
  const decodedUsername = decodeURIComponent(username).trim().toLowerCase();
  const supabase = await createClient();

  // Find user by username or id
  let userQuery = (supabase.from("profiles") as any).select("id, username");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedUsername);

  if (isUuid) {
    userQuery = userQuery.eq("id", decodedUsername);
  } else {
    userQuery = userQuery.ilike("username", decodedUsername);
  }

  const { data: profile } = await userQuery.single();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find shelf
  const { data: shelf, error } = await (supabase.from("shelves") as any)
    .select("id, user_id, name, description, cover_image, is_public, order_index, is_default, slug, created_at")
    .eq("id", shelfId)
    .single();

  if (error || !shelf || shelf.user_id !== profile.id) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  // Privacy rule: visitor requesting private shelf gets 403 Forbidden
  if (!shelf.is_public) {
    return NextResponse.json({ error: "This shelf is private." }, { status: 403 });
  }

  // Fetch books in this shelf
  const { data: books } = await (supabase.from("shelf_books") as any)
    .select("source, book_id, order_index, created_at")
    .eq("shelf_id", shelf.id)
    .order("order_index", { ascending: true });

  return NextResponse.json({
    ...shelf,
    books: books ?? [],
  });
}
