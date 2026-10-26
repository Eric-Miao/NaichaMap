import { PlaceSearchError, searchPlaces } from "@/features/place-search/service";

export async function handlePlaceSearch(
  request: Request,
  search: typeof searchPlaces = searchPlaces,
) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ results: await search(query) });
  } catch (error) {
    if (error instanceof PlaceSearchError) {
      return Response.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.code === "INVALID_QUERY" ? 400 : 503 },
      );
    }
    return Response.json(
      { error: { code: "SEARCH_UNAVAILABLE", message: "暂时无法搜索地点", retryable: true } },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  return handlePlaceSearch(request);
}
