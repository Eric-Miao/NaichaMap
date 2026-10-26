import type { CorrectionSubmission } from "@/features/corrections/contracts";
import type { NearbyErrorBody, NearbyInput, NearbyResponse } from "@/features/nearby/contracts";
import type { PlaceSearchResult } from "@/features/place-search/service";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class MapApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "MapApiError";
  }
}

async function readError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as
    | (NearbyErrorBody & { retryAfterSeconds?: number })
    | null;
  throw new MapApiError(
    body?.error.code ?? "REQUEST_FAILED",
    body?.error.message ?? "请求失败",
    body?.error.retryable ?? response.status >= 500,
    body?.retryAfterSeconds,
  );
}

export async function fetchNearby(
  input: NearbyInput,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<NearbyResponse> {
  const response = await fetchImpl("/api/nearby", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) return readError(response);
  return response.json() as Promise<NearbyResponse>;
}

export async function searchPlaces(query: string, signal?: AbortSignal, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/search-place?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return readError(response);
  const body = (await response.json()) as { results: PlaceSearchResult[] };
  return body.results;
}

export async function submitCorrection(
  input: CorrectionSubmission,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl("/api/corrections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) return readError(response);
  return { ok: true as const };
}
