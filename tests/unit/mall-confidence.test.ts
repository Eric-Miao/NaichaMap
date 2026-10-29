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

  it("accepts matching provider parent within 500 metres without mall text", () => {
    expect(resolveMallForStore({
      ...store,
      name: "喜茶",
      address: "淮海中路",
      location: { lng: 121.459, lat: 31.217 },
    }, [
      { ...mall, boundary: null },
    ])?.id).toBe("mall-1");
  });

  it("prefers an exact provider parent over an earlier name-only match", () => {
    const nameOnlyMall = {
      ...mall,
      id: "mall-name-only",
      providerPlaceId: "OTHER-PARENT",
      name: "甲乙广场",
      boundary: null,
    };
    const exactParentMall = {
      ...mall,
      id: "mall-exact-parent",
      providerPlaceId: "PARENT-1",
      name: "甲乙二期广场",
      boundary: null,
    };

    expect(resolveMallForStore({
      ...store,
      name: "喜茶（甲乙广场店）",
      address: "甲乙广场一层",
    }, [nameOnlyMall, exactParentMall])?.id).toBe("mall-exact-parent");
  });

  it("accepts normalized mall text within 500 metres without a provider parent", () => {
    expect(resolveMallForStore({
      ...store,
      providerParentId: null,
      location: { lng: 121.459, lat: 31.217 },
    }, [
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

  it("rejects matching parent and name beyond 500 metres", () => {
    expect(
      resolveMallForStore(
        { ...store, location: { lng: 121.47, lat: 31.217 } },
        [{ ...mall, boundary: null }],
      ),
    ).toBeNull();
  });
});
