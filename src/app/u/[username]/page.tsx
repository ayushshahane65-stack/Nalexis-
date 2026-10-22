import PublicProfileClient from "./PublicProfileClient";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `@${decodeURIComponent(username)} | Living Library - Nalexis`,
    description: `Explore the public Living Library, bookshelves, and reflections of @${decodeURIComponent(username)}.`,
  };
}

export default async function PublicUserPage({ params }: PageProps) {
  const { username } = await params;
  return <PublicProfileClient username={username} />;
}
