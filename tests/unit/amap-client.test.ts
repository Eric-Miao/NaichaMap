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

  it("combines type and keyword mall searches when one source has no results", async () => {
    const seenQueries: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const query = url.searchParams.get("types") ?? url.searchParams.get("keywords") ?? "";
      seenQueries.push(query);
      const pois = query === "商场"
        ? [{
            id: "mall-1",
            name: "上海国金中心商场",
            typecode: "060101",
            address: "世纪大道8号",
            location: "121.507,31.236",
          }]
        : [];
      return new Response(JSON.stringify({ status: "1", count: String(pois.length), pois }));
    });

    const client = new AmapClient({ key: "secret-key", fetch: fetchMock });
    const result = await client.searchMalls({ lng: 121.507, lat: 31.236 });

    expect(result.map((mall) => mall.providerPlaceId)).toEqual(["mall-1"]);
    expect(seenQueries).toEqual(expect.arrayContaining(["060101", "060102", "商场", "购物中心"]));
  });

  it("rejects keyword tenants that mention a shopping center", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const pois = url.searchParams.get("keywords") === "购物中心"
        ? [
            {
              id: "mall-1",
              name: "上海国金中心商场",
              typecode: "060101",
              address: "世纪大道8号",
              location: "121.507,31.236",
            },
            {
              id: "tenant-1",
              name: "星巴克（上海国金中心购物中心店）",
              typecode: "050500",
              address: "世纪大道8号一层",
              location: "121.5071,31.2361",
            },
          ]
        : [];
      return new Response(JSON.stringify({ status: "1", count: String(pois.length), pois }));
    });

    const client = new AmapClient({ key: "secret-key", fetch: fetchMock });
    const result = await client.searchMalls({ lng: 121.507, lat: 31.236 });

    expect(result.map((mall) => mall.providerPlaceId)).toEqual(["mall-1"]);
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

  it("keeps successful beverage categories when one category times out", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.searchParams.get("keywords") === "奶茶") {
        throw new DOMException("aborted", "AbortError");
      }
      const isCoffeeType = url.searchParams.get("types") === "050500";
      const body = isCoffeeType ? page1 : { ...page1, count: "0", pois: [] };
      return new Response(JSON.stringify(body));
    });
    const client = new AmapClient({ key: "secret-key", fetch: fetchMock, timeoutMs: 5 });

    const result = await client.searchBeverages({ lng: 121.48, lat: 31.23 });

    expect(result.map((poi) => poi.providerPlaceId)).toEqual(["coffee-1", "tea-1"]);
  });

  it("fails when every beverage category fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    const client = new AmapClient({ key: "secret-key", fetch: fetchMock, timeoutMs: 5 });

    await expect(client.searchBeverages({ lng: 121.48, lat: 31.23 })).rejects.toEqual(
      expect.objectContaining({ code: "AMAP_TIMEOUT" }),
    );
  });
});
