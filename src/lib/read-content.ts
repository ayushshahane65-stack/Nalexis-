import sanitizeHtml from "sanitize-html";

const GUTENBERG_HOSTS = new Set(["gutenberg.org", "www.gutenberg.org"]);

function isGutenbergUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      (GUTENBERG_HOSTS.has(url.hostname) || url.hostname.endsWith(".gutenberg.org"));
  } catch {
    return false;
  }
}

export async function fetchGutenbergHtml(url: string): Promise<string> {
  if (!isGutenbergUrl(url)) throw new Error("The book has no supported HTML reading file.");

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(45000),
    headers: {
      "User-Agent": "Nalexis/1.0 (book reader)",
      Accept: "text/html",
    },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`Gutenberg returned HTTP ${response.status}.`);
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    throw new Error("Gutenberg did not return an HTML book.");
  }

  const finalUrl = response.url;
  if (finalUrl && !isGutenbergUrl(finalUrl)) {
    throw new Error("Gutenberg redirected to an unsupported host.");
  }

  const html = await response.text();
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}
