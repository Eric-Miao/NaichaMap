import { describe, expect, it, vi } from "vitest";

import { fetchNearby } from "../../src/features/map/api";

describe("fetchNearby", () => {
  it("keeps coordinates in a POST body and forwards cancellation", async () => {
    const result = { currentMall: null, groups: [], cacheStatus: "fresh" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Response.json(result);
    });
    const controller = new AbortController();

    await expect(
      fetchNearby({ lng: 121.47, lat: 31.23 }, controller.signal, fetchMock),
    ).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/nearby",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ lng: 121.47, lat: 31.23 }),
        signal: controller.signal,
      }),
    );
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("121.47");
  });
});
