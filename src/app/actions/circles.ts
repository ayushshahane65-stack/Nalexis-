"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getPublicCircles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_circles")
    .select("*, owner:profiles(display_name, avatar_color)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) { console.error("getPublicCircles:", error.message); return []; }
  return data ?? [];
}

export async function getMyCircles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", user.id);

  if (error || !data?.length) return [];

  const circleIds = data.map((m: any) => m.circle_id);
  const { data: circles } = await supabase
    .from("reading_circles")
    .select("*")
    .in("id", circleIds);

  return circles ?? [];
}

export async function createCircle(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name        = (formData.get("name")        as string).trim();
  const bookId      =  formData.get("book_id")     as string;
  const bookSource  =  formData.get("book_source") as string;
  const description =  formData.get("description") as string | null;
  const isPublic    =  formData.get("is_public")  === "true";

  if (!name || !bookId || !["gutenberg", "openlibrary", "oapen", "doab"].includes(bookSource)) {
    throw new Error("Name and valid source book are required");
  }

  const { data: circle, error } = await (supabase.from("reading_circles") as any)
    .insert({ name, book_id: bookId, book_source: bookSource, owner_id: user.id, description, is_public: isPublic })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await (supabase.from("circle_members") as any)
    .insert({ circle_id: circle.id, user_id: user.id });

  revalidatePath("/circles");
  return circle;
}

export async function joinCircle(circleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("circle_members") as any)
    .insert({ circle_id: circleId, user_id: user.id });

  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath("/circles");
}

export async function leaveCircle(circleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id",   user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/circles");
}

export async function updateCircleProgress(circleId: string, currentPage: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("circle_members") as any)
    .update({ current_page: currentPage })
    .eq("circle_id", circleId)
    .eq("user_id",   user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/circles");
}

export async function getCircleMembers(circleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circle_members")
    .select("*, profile:profiles(display_name, avatar_color)")
    .eq("circle_id", circleId)
    .order("joined_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}
