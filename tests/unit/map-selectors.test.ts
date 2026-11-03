import { describe, expect, it } from "vitest";

import { buildDirectoryView, filterStoreGroups } from "../../src/features/map/selectors";

const groups = [
  {
    kind: "mall" as const,
    id: "mall-1",
    mall: { id: "mall-1", name: "商场 A", address: "地址 A", distanceM: 100 },
    stores: [
      { id: "tea", name: "喜茶", branchName: null, category: "tea_drink" as const, address: "", mallId: "mall-1", location: { lng: 1, lat: 1 }, distanceM: 100 },
      { id: "coffee", name: "Manner", branchName: null, category: "coffee" as const, address: "", mallId: "mall-1", location: { lng: 1, lat: 1 }, distanceM: 120 },
    ],
  },
  {
    kind: "street" as const,
    id: "street" as const,
    mall: null,
    stores: [
      { id: "juice", name: "果汁店", branchName: null, category: "beverage" as const, address: "", mallId: null, location: { lng: 1, lat: 1 }, distanceM: 180 },
    ],
  },
];

describe("filterStoreGroups", () => {
  it("preserves all grouping and order for the all filter", () => {
    expect(filterStoreGroups(groups, "all", "all")).toEqual(groups);
  });

  it("keeps tea and beverage in their original groups", () => {
    const result = filterStoreGroups(groups, "tea_drink", "all");
    expect(result.map((group) => group.id)).toEqual(["mall-1", "street"]);
    expect(result.flatMap((group) => group.stores.map((store) => store.id))).toEqual(["tea", "juice"]);
  });

  it("keeps only non-empty coffee groups without reordering", () => {
    const result = filterStoreGroups(groups, "coffee", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mall-1");
    expect(result[0].stores.map((store) => store.id)).toEqual(["coffee"]);
  });

  it("combines a mall location filter with the drink category filter", () => {
    const result = filterStoreGroups(groups, "coffee", "mall-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mall-1");
    expect(result[0].stores.map((store) => store.id)).toEqual(["coffee"]);
  });

  it("can isolate unmatched street stores independently of category", () => {
    const result = filterStoreGroups(groups, "tea_drink", "street");
    expect(result.map((group) => group.id)).toEqual(["street"]);
    expect(result[0].stores.map((store) => store.id)).toEqual(["juice"]);
  });
});

describe("buildDirectoryView", () => {
  it("numbers visible stores and groups once, for both map and list", () => {
    const view = buildDirectoryView(groups, "all", "all", "mall-1");
    expect(view.totalStores).toBe(3);
    expect(view.indexByStoreId).toEqual({ tea: "01", coffee: "02", juice: "03" });
    expect(view.rangeByGroupId["mall-1"]).toEqual({ start: "01", end: "02", count: 2 });
    expect(view.rangeByGroupId.street).toEqual({ start: "03", end: "03", count: 1 });
    expect(view.currentMallId).toBe("mall-1");
    expect(view.filtered).toBe(false);
  });

  it("renumbers after a category filter and keeps counts for the other rail", () => {
    const view = buildDirectoryView(groups, "coffee", "all");
    expect(view.totalStores).toBe(1);
    expect(view.indexByStoreId).toEqual({ coffee: "01" });
    expect(view.rangeByGroupId).not.toHaveProperty("street");
    expect(view.categories).toEqual({ all: 3, tea_drink: 2, coffee: 1 });
    expect(view.locations).toEqual([
      { id: "mall-1", label: "商场 A", count: 1 },
      { id: "street", label: "周边街铺", count: 0 },
    ]);
    expect(view.filtered).toBe(true);
  });

  it("reports an empty view for a filter with no matches", () => {
    const view = buildDirectoryView(groups, "coffee", "street");
    expect(view.groups).toEqual([]);
    expect(view.totalStores).toBe(0);
    expect(view.filtered).toBe(true);
  });
});
