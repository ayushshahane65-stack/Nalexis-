"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookSource } from "@/lib/books";

type ShelfStatus = "reading" | "finished" | "to-read" | "favourites" | "paused";

export async function getMyShelf() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shelf_entries")
    .select("id, book_id, book_source, status, current_page, personal_rating, note, started_at, finished_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) { console.error("getMyShelf:", error.message); return []; }
  return data ?? [];
}

export async function addToShelf(bookId: string, bookSource: BookSource, status: ShelfStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("shelf_entries") as any).upsert(
    {
      user_id:    user.id,
      book_id:    bookId,
      book_source: bookSource,
      status,
      started_at: status === "reading" ? new Date().toISOString().split("T")[0] : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_source,book_id,status" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath(`/book/${bookSource}/${encodeURIComponent(bookId)}`);
}

export async function updateReadingProgress(
  bookId: string,
  bookSource: BookSource,
  currentPage: number,
  totalPages: number,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const isFinished = currentPage >= totalPages;

  const { error } = await (supabase.from("shelf_entries") as any)
    .update({
      current_page: currentPage,
      status:       isFinished ? "finished" : "reading",
      finished_at:  isFinished ? new Date().toISOString().split("T")[0] : null,
      updated_at:   new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .eq("book_source", bookSource)
    .eq("status",  "reading");

  if (error) throw new Error(error.message);
  if (isFinished) await incrementReadingGoal();
  revalidatePath("/library");
  revalidatePath("/home");
}

export async function updateNote(bookId: string, bookSource: BookSource, status: ShelfStatus, note: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("shelf_entries") as any)
    .update({ note, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .eq("book_source", bookSource)
    .eq("status",  status);

  if (error) throw new Error(error.message);
  revalidatePath("/library");
}

export async function rateBook(bookId: string, bookSource: BookSource, rating: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("shelf_entries") as any)
    .update({ personal_rating: rating, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .eq("book_source", bookSource)
    .eq("status",  "finished");

  if (error) throw new Error(error.message);
  revalidatePath("/library");
}

export async function removeFromShelf(bookId: string, bookSource: BookSource, status: ShelfStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("shelf_entries") as any)
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .eq("book_source", bookSource)
    .eq("status",  status);

  if (error) throw new Error(error.message);
  revalidatePath("/library");
  revalidatePath(`/book/${bookSource}/${encodeURIComponent(bookId)}`);
}

export async function getBookShelfStatus(bookId: string, bookSource: BookSource) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("shelf_entries")
    .select("status, current_page, personal_rating, note")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .eq("book_source", bookSource);

  return data ?? [];
}

export async function getReadingGoal(year?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("reading_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("year",    year ?? new Date().getFullYear())
    .single();

  return data;
}

export async function upsertReadingGoal(target: number, year?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase.from("reading_goals") as any).upsert(
    {
      user_id:    user.id,
      year:       year ?? new Date().getFullYear(),
      target,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,year" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/home");
  revalidatePath("/library");
}

async function incrementReadingGoal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const year = new Date().getFullYear();
  const { data: goal } = await (supabase.from("reading_goals") as any)
    .select("id, progress")
    .eq("user_id", user.id)
    .eq("year",    year)
    .single();

  if (goal) {
    await (supabase.from("reading_goals") as any)
      .update({ progress: (goal.progress ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("year",    year);
  }
}
