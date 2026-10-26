import "server-only";

import { AmapClient, AmapProviderError } from "@/lib/amap/client";
import type { NormalizedPlace } from "@/lib/domain/store";

export type PlaceSearchResult = {
  label: string;
  address: string;
  location: { lng: number; lat: number };
};

export type PlaceSearchErrorCode = "INVALID_QUERY" | "SEARCH_TIMEOUT" | "SEARCH_QUOTA" | "SEARCH_UNAVAILABLE";

export class PlaceSearchError extends Error {
  constructor(
    public readonly code: PlaceSearchErrorCode,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PlaceSearchError";
  }
}

type PlaceProvider = { searchPlaces(query: string): Promise<NormalizedPlace[]> };

export function createPlaceSearchService(provider: PlaceProvider) {
  return async function searchPlaces(rawQuery: string): Promise<PlaceSearchResult[]> {
    const query = rawQuery.trim();
    if (query.length < 2 || query.length > 80) {
      throw new PlaceSearchError("INVALID_QUERY", "请输入 2 到 80 个字符", false);
    }

    try {
      const places = await provider.searchPlaces(query);
      return places.slice(0, 10).map((place) => ({
        label: place.name,
        address: place.address,
        location: place.wgs84,
      }));
    } catch (error) {
      if (error instanceof AmapProviderError) {
        if (error.code === "AMAP_TIMEOUT") {
          throw new PlaceSearchError("SEARCH_TIMEOUT", "搜索超时，请重试", true);
        }
        if (error.code === "AMAP_QUOTA") {
          throw new PlaceSearchError("SEARCH_QUOTA", "今天的搜索次数已用完", true);
        }
      }
      throw new PlaceSearchError("SEARCH_UNAVAILABLE", "暂时无法搜索地点", true);
    }
  };
}

export async function searchPlaces(query: string) {
  return createPlaceSearchService(new AmapClient())(query);
}
