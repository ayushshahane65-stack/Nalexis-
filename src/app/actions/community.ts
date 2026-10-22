"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type DiscussionTab = "chapters" | "themes" | "reviews" | "quotes" | "questions" | "theories" | "resources";

export async function getCommunityByBookId(bookId: string, bookSource: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("id,book_id,book_source,member_count,post_count")
    .eq("book_id", bookId)
    .eq("book_source", bookSource)
    .single();
  return data;
}

export async function getAllCommunities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .select("id,book_id,book_source,member_count,post_count")
    .order("member_count", { ascending: false });
  if (error) { console.error("getAllCommunities:", error.message); return []; }
  return data ?? [];
}

export async function joinCommunity(communityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("community_members") as any)
    .insert({ community_id: communityId, user_id: user.id });

  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath("/communities");
}

export async function leaveCommunity(communityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/communities");
}

export async function isCommunityMember(communityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("community_members")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .single();

  return !!data;
}

export async function getCommunityPosts(communityId: string, tab?: DiscussionTab) {
  const supabase = await createClient();

  let query = supabase
    .from("discussion_posts")
    .select("*, author:profiles(id, display_name, avatar_color)")
    .eq("community_id", communityId)
    .order("pinned",     { ascending: false })
    .order("created_at", { ascending: false });

  if (tab) query = query.eq("tab", tab);

  const { data, error } = await query;
  if (error) { console.error("getCommunityPosts:", error.message); return []; }
  return data ?? [];
}

export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const communityId = formData.get("community_id") as string;
  const tab         = formData.get("tab") as DiscussionTab;
  const title       = (formData.get("title") as string).trim();
  const body        = (formData.get("body")  as string).trim();

  if (!title || !body) throw new Error("Title and body are required");

  const { error } = await (supabase.from("discussion_posts") as any)
    .insert({ community_id: communityId, user_id: user.id, tab, title, body });

  if (error) throw new Error(error.message);
  revalidatePath(`/communities/${communityId}`);
}

export async function deletePost(postId: string, communityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("discussion_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/communities/${communityId}`);
}

export async function togglePostLike(postId: string, communityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("post_likes").delete()
      .eq("post_id", postId).eq("user_id", user.id);
  } else {
    await (supabase.from("post_likes") as any)
      .insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath(`/communities/${communityId}`);
}

export async function hasLikedPost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  return !!data;
}
