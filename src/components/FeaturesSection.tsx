import FeatureCard from "./FeatureCard";

interface FeatureData {
  id: string;
  title: string;
  description: string;
  bullets: string[];
}

const FEATURES: FeatureData[] = [
  {
    id: "offline-epub",
    title: "Offline EPUB reading",
    description:
      "Save books directly to your device and continue reading without active network connection. Progress, highlights, and annotations persist seamlessly.",
    bullets: [
      "Instant offline storage on client device",
      "Automatic bidirectional sync on reconnection",
      "Customizable typography, margins, and dark mode",
      "Integrated dictionary search and margin notes",
    ],
  },
  {
    id: "personal-library",
    title: "Personal library catalog",
    description:
      "Structure your collection with custom shelves, reading stages, and quiet progress metrics designed around books rather than streaks.",
    bullets: [
      "Custom shelves: Current, To-read, Finished, and Reference",
      "Targeted yearly reading goals with monthly breakdown",
      "Private reflections and personal rating notes",
      "One-click Goodreads CSV import compatibility",
    ],
  },
  {
    id: "communities",
    title: "Genre reading rooms",
    description:
      "Engage in long-form, thoughtful discussion rooms arranged by literary tradition and subject matter rather than algorithmic popularity.",
    bullets: [
      "Focused rooms: Classical literature, speculative fiction, philosophy",
      "Dedicated chapter-by-chapter discussion threads",
      "Community reading lists curated by active members",
      "Civil, low-noise community standards",
    ],
  },
  {
    id: "reading-circles",
    title: "Focused reading circles",
    description:
      "Form small groups of up to twenty readers who move through a single volume together on a structured weekly rhythm.",
    bullets: [
      "Private circles limited to 2 to 20 participating readers",
      "Shared margin notes and synchronized page insights",
      "Weekly pace benchmarks and discussion milestones",
      "Archive circle logs for future review",
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--eyebrow)]">
          Built for focus
        </p>
        <h2
          id="features-heading"
          className="mt-2 font-serif text-3xl font-normal tracking-tight text-[var(--text)] sm:text-4xl"
        >
          Built for the craft of reading
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--text-muted)]">
          Every tool inside Nalexis is designed to remove friction, deepen focus, and keep you immersed in the text.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.id} id={feature.id}>
            <FeatureCard
              title={feature.title}
              description={feature.description}
              bullets={feature.bullets}
            />
          </div>
        ))}
      </div>

      {/* Thin divider line between sections */}
      <hr className="mt-16 border-t border-[var(--border)]" />
    </section>
  );
}
