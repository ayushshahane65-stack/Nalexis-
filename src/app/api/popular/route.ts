import { GET as browse } from "@/app/api/browse/route";

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.searchParams.set("category", "popular");
  return browse(new Request(url, { headers: request.headers }));
}
