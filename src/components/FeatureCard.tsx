import { Check, DownloadCloud, Library, Users, UsersRound } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  bullets: string[];
}

function getFeatureIcon(title: string) {
  if (title.includes("Offline")) return DownloadCloud;
  if (title.includes("Personal")) return Library;
  if (title.includes("Communities")) return Users;
  return UsersRound;
}

export default function FeatureCard({ title, description, bullets }: FeatureCardProps) {
  const Icon = getFeatureIcon(title);

  return (
    <article className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-xs transition-shadow duration-200 hover:shadow-md sm:p-7">
      <div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--card-subtle)] text-[var(--primary)] dark:text-[var(--eyebrow)]">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <h3 className="mt-4 font-serif text-xl font-normal tracking-tight text-[var(--text)]">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5 border-t border-[var(--border-subtle)] pt-5" role="list">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--primary)] dark:text-[var(--eyebrow)]" aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
