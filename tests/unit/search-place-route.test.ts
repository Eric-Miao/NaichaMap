import { describe, expect, it, vi } from "vitest";

import { AmapProviderError } from "../../src/lib/amap/client";
import { createPlaceSearchService } from "../../src/features/place-search/service";

const places = Array.from({ length: 12 }, (_, index) => ({
  provider: "amap" as const,
  providerPlaceId: `place-${index}`,
  name: `上海商场 ${index}`,
  address: `上海市地址 ${index}`,
  gcj02: { lng: 121.48, lat: 31.23 },
  wgs84: { lng: 121.475 + index / 1000, lat: 31.228 },
  providerParentId: null,
}));

describe("place search", () => {
  it("trims the query and returns at most 10 sanitized Shanghai results", async () => {
    const provider = { searchPlaces: vi.fn(async () => places) };
    const search = createPlaceSearchService(provider);

    const result = await search("  环贸 iapm  ");

    expect(provider.searchPlaces).toHaveBeenCalledWith("环贸 iapm");
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({
      label: "上海商场 0",
      address: "上海市地址 0",
      location: { lng: 121.475, lat: 31.228 },
    });
    expect(result[0]).not.toHaveProperty("providerPlaceId");
    expect(result[0]).not.toHaveProperty("gcj02");
  });

  it.each(["", "a", "x".repeat(81)])("rejects queries outside 2..80 characters", async (query) => {
    const search = createPlaceSearchService({ searchPlaces: vi.fn() });
    await expect(search(query)).rejects.toMatchObject({ code: "INVALID_QUERY" });
  });

  it("keeps empty results stable", async () => {
    const search = createPlaceSearchService({ searchPlaces: vi.fn(async () => []) });
    await expect(search("人民广场")).resolves.toEqual([]);
  });

  it.each([
    ["AMAP_TIMEOUT", "SEARCH_TIMEOUT"],
    ["AMAP_QUOTA", "SEARCH_QUOTA"],
  ] as const)("maps %s to %s", async (providerCode, expected) => {
    const search = createPlaceSearchService({
      searchPlaces: vi.fn(async () => {
        throw new AmapProviderError(providerCode, "provider error");
      }),
    });

    await expect(search("人民广场")).rejects.toMatchObject({ code: expected });
  });
});
