import { PlaceSearchError, searchPlaces } from "@/features/place-search/service";
import { jsonError } from "@/lib/http/responses";

export async function handlePlaceSearch(
  request: Request,
  search: typeof searchPlaces = searchPlaces,
) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ results: await search(query) });
  } catch (error) {
    if (error instanceof PlaceSearchError) {
      return jsonError(error.code, error.message, error.retryable, error.code === "INVALID_QUERY" ? 400 : 503);
    }
    return jsonError("SEARCH_UNAVAILABLE", "暂时无法搜索地点", true, 503);
  }
}

export async function GET(request: Request) {
  return handlePlaceSearch(request);
}
