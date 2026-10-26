import { describe, expect, it, vi } from "vitest";

import { AmapClient } from "../../src/lib/amap/client";
import page1 from "../fixtures/amap/around-page-1.json";
import page2 from "../fixtures/amap/around-page-2.json";
import limited from "../fixtures/amap/error-limit.json";

describe("AmapClient", () => {
  it("paginates and de-duplicates provider IDs", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const isCoffeeType = url.searchParams.get("types") === "050500";
      const page = Number(url.searchParams.get("page"));
      const body = isCoffeeType ? (page === 1 ? page1 : page2) : { ...page1, count: "0", pois: [] };
      return new Response(JSON.stringify(body));
    });

    const client = new AmapClient({ key: "secret-key", fetch: fetchMock });
    const result = await client.searchBeverages({ lng: 121.48, lat: 31.23 });

    expect(result.map((poi) => poi.providerPlaceId)).toEqual(["coffee-1", "tea-1", "tea-2"]);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("maps quota errors without exposing the request URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(limited)));
    const client = new AmapClient({ key: "secret-key", fetch: fetchMock });

    await expect(client.searchMalls({ lng: 121.48, lat: 31.23 })).rejects.toMatchObject({
      code: "AMAP_QUOTA",
    });
  });

  it("maps aborts to a stable timeout error", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    const client = new AmapClient({ key: "secret-key", fetch: fetchMock, timeoutMs: 5 });

    await expect(client.searchPlaces("喜茶")).rejects.toEqual(
      expect.objectContaining({ code: "AMAP_TIMEOUT" }),
    );
  });
});
