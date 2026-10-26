import { describe, expect, it } from "vitest";

import { resolveCurrentMall, resolveMallForStore } from "../../src/features/nearby/mall-confidence";

const mall = {
  id: "mall-1",
  providerPlaceId: "PARENT-1",
  name: "上海环贸iapm商场",
  address: "淮海中路999号",
  location: { lng: 121.456, lat: 31.217 },
  boundary: [
    { lng: 121.455, lat: 31.216 },
    { lng: 121.457, lat: 31.216 },
    { lng: 121.457, lat: 31.218 },
    { lng: 121.455, lat: 31.218 },
  ],
};

const store = {
  providerParentId: "PARENT-1",
  name: "喜茶（环贸iapm店）",
  address: "环贸iapm商场LG1层",
  location: { lng: 121.4561, lat: 31.2171 },
};

describe("mall confidence", () => {
  it("prefers boundary containment for the current mall", () => {
    expect(resolveCurrentMall({ lng: 121.456, lat: 31.217 }, [mall])?.id).toBe("mall-1");
  });

  it("accepts parent, distance and normalized name evidence together", () => {
    expect(resolveMallForStore({ ...store, location: { lng: 121.457, lat: 31.217 } }, [
      { ...mall, boundary: null },
    ])?.id).toBe("mall-1");
  });

  it("rejects distance-only evidence", () => {
    expect(
      resolveMallForStore(
        { ...store, providerParentId: null, name: "喜茶", address: "淮海中路" },
        [{ ...mall, boundary: null }],
      ),
    ).toBeNull();
  });

  it("rejects name-only evidence when parent or distance is wrong", () => {
    expect(
      resolveMallForStore(
        { ...store, providerParentId: "OTHER", location: { lng: 121.5, lat: 31.25 } },
        [{ ...mall, boundary: null }],
      ),
    ).toBeNull();
  });
});
