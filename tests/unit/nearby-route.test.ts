import { describe, expect, it, vi } from "vitest";

const { getNearby } = vi.hoisted(() => ({ getNearby: vi.fn() }));

vi.mock("../../src/features/nearby/service", () => ({ getNearby }));

import * as route from "../../src/app/api/nearby/route";

function request(body: string) {
  return new Request("http://localhost/api/nearby", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/nearby", () => {
  it("is the only exported HTTP method", () => {
    expect(route.POST).toBeTypeOf("function");
    expect(route).not.toHaveProperty("GET");
  });

  it.each([
    ["not-json", "INVALID_REQUEST"],
    [JSON.stringify({}), "INVALID_REQUEST"],
    [JSON.stringify({ lng: 181, lat: 31 }), "INVALID_REQUEST"],
    [JSON.stringify({ lng: 116.4, lat: 39.9 }), "OUTSIDE_SHANGHAI"],
  ])("rejects invalid input without echoing coordinates", async (body, code) => {
    const response = await route.POST(request(body));
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(JSON.parse(text).error.code).toBe(code);
    expect(text).not.toContain("116.4");
    expect(text).not.toContain("39.9");
    expect(text).not.toContain("181");
  });

  it("returns the stable nearby response", async () => {
    const result = { currentMall: null, groups: [], cacheStatus: "fresh" };
    getNearby.mockResolvedValueOnce(result);

    const response = await route.POST(request(JSON.stringify({ lng: 121.47, lat: 31.23 })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(getNearby).toHaveBeenCalledWith({ lng: 121.47, lat: 31.23 });
  });
});
