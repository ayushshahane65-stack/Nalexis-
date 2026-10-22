"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  FolderPlus,
  MessageSquareQuote,
  Sparkles,
  Trophy,
  Compass,
} from "lucide-react";

export interface JourneyEventItem {
  id?: string;
  event_type: "started_book" | "finished_book" | "added_to_shelf" | "saved_quote" | "reached_goal" | "explored_genre";
  source?: string | null;
  book_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

interface ReadingJourneyTimelineProps {
  events: JourneyEventItem[];
}

export default function ReadingJourneyTimeline({ events }: ReadingJourneyTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-zinc-50/50 p-8 text-center dark:bg-zinc-900/30">
        <Sparkles className="size-7 mx-auto text-zinc-400 mb-2" />
        <p className="text-sm font-serif font-medium text-[var(--text)]">Your Reading Journey is just beginning</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          As you open books, finish chapters, and save quotes, a gentle timeline of your reading history will unfold here.
        </p>
      </div>
    );
  }

  const getEventDetails = (event: JourneyEventItem) => {
    switch (event.event_type) {
      case "started_book":
        return {
          icon: BookOpen,
          iconColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60",
          title: "Started reading",
          description: event.source && event.book_id ? `Opened book ${event.book_id}` : "Began a new book",
        };
      case "finished_book":
        return {
          icon: CheckCircle2,
          iconColor: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60",
          title: "Finished reading",
          description: event.metadata?.rating ? `Completed book • Rated ${event.metadata.rating} stars` : "Completed a book in their journey",
        };
      case "added_to_shelf":
        return {
          icon: FolderPlus,
          iconColor: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60",
          title: "Added to shelf",
          description: event.metadata?.shelf_name ? `Added to "${event.metadata.shelf_name}"` : "Organized into a shelf",
        };
      case "saved_quote":
        return {
          icon: MessageSquareQuote,
          iconColor: "text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60",
          title: "Saved a quote",
          description: event.metadata?.preview ? `"${event.metadata.preview}..."` : "Saved a passage while reading",
        };
      case "reached_goal":
        return {
          icon: Trophy,
          iconColor: "text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60",
          title: "Reached yearly goal",
          description: "Celebrated completing their yearly reading aspiration",
        };
      case "explored_genre":
        return {
          icon: Compass,
          iconColor: "text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-950/60",
          title: "Explored new genre",
          description: event.metadata?.genre ? `Explored ${event.metadata.genre}` : "Broadened reading horizons",
        };
      default:
        return {
          icon: Sparkles,
          iconColor: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800",
          title: "Reading milestone",
          description: "A moment in the reading journey",
        };
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
      {events.map((event, index) => {
        const details = getEventDetails(event);
        const Icon = details.icon;
        const dateStr = new Date(event.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div key={event.id || index} className="relative flex items-start gap-3.5 group">
            {/* Timeline Node Icon */}
            <div
              className={`absolute -left-6 mt-0.5 flex size-5.5 items-center justify-center rounded-full ring-4 ring-[var(--card)] ${details.iconColor}`}
            >
              <Icon className="size-3" />
            </div>

            {/* Content Card */}
            <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[var(--text)]">{details.title}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{dateStr}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{details.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
