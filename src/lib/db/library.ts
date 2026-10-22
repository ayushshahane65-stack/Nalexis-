/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JourneyEventType } from "@/lib/supabase/database.types";

export const DEFAULT_SHELVES_SPEC = [
  { slug: "currently-reading", name: "Currently Reading", description: "Books you are actively exploring", order_index: 0 },
  { slug: "finished", name: "Finished Books", description: "Completed titles in your reading journey", order_index: 1 },
  { slug: "want-to-read", name: "Wishlist / Want to Read", description: "Books queued for future discovery", order_index: 2 },
  { slug: "favourites", name: "Favourites", description: "Treasured volumes and personal recommendations", order_index: 3 },
  { slug: "imported-epubs", name: "Imported EPUBs", description: "Private on-device uploaded EPUB files", order_index: 4 },
  { slug: "paused-dropped", name: "Paused / Dropped", description: "Books temporarily set aside or set down", order_index: 5 },
  { slug: "downloaded", name: "Downloaded Books", description: "Coming soon, for legal downloadable books", order_index: 6 },
] as const;

/**
 * Ensures a user has all required default system shelves created.
 */
export async function ensureDefaultShelves(
  supabase: any,
  userId: string
) {
  const { data: existingShelves, error: fetchErr } = await (supabase.from("shelves") as any)
    .select("slug")
    .eq("user_id", userId)
    .eq("is_default", true);

  if (fetchErr) {
    console.error("ensureDefaultShelves fetch error:", fetchErr.message);
    return;
  }

  const existingSlugs = new Set((existingShelves ?? []).map((s: any) => s.slug));
  const missing = DEFAULT_SHELVES_SPEC.filter((spec) => !existingSlugs.has(spec.slug));

  if (missing.length === 0) return;

  const toInsert = missing.map((spec) => ({
    user_id: userId,
    name: spec.name,
    description: spec.description,
    is_default: true,
    is_public: false, // All default shelves start private
    order_index: spec.order_index,
    slug: spec.slug,
  }));

  const { error: insertErr } = await (supabase.from("shelves") as any).insert(toInsert);
  if (insertErr) {
    console.error("ensureDefaultShelves insert error:", insertErr.message);
  }
}

/**
 * Records a reflective journey milestone in the user's reading history.
 */
export async function logJourneyEvent(
  supabase: any,
  userId: string,
  eventType: JourneyEventType,
  source?: string | null,
  bookId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    const { error } = await (supabase.from("journey_events") as any).insert({
      user_id: userId,
      event_type: eventType,
      source: source ?? null,
      book_id: bookId ?? null,
      metadata: metadata ?? {},
    });
    if (error) {
      console.warn("logJourneyEvent non-fatal error:", error.message);
    }
  } catch (err) {
    console.warn("logJourneyEvent exception:", err);
  }
}
