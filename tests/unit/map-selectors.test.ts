import { describe, expect, it } from "vitest";

import { selectVisibleGroups } from "../../src/features/map/selectors";
import type { MapState } from "../../src/features/map/reducer";

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

function state(filter: MapState["filter"]): MapState {
  return {
    status: "ready-nearby",
    filter,
    drawerOpen: true,
    selectedId: null,
    data: { currentMall: null, groups, cacheStatus: "fresh" },
    error: null,
    correction: { status: "idle", retryAfterSeconds: null },
  };
}

describe("selectVisibleGroups", () => {
  it("preserves all grouping and order for the all filter", () => {
    expect(selectVisibleGroups(state("all"))).toEqual(groups);
  });

  it("keeps tea and beverage in their original groups", () => {
    const result = selectVisibleGroups(state("tea_drink"));
    expect(result.map((group) => group.id)).toEqual(["mall-1", "street"]);
    expect(result.flatMap((group) => group.stores.map((store) => store.id))).toEqual(["tea", "juice"]);
  });

  it("keeps only non-empty coffee groups without reordering", () => {
    const result = selectVisibleGroups(state("coffee"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mall-1");
    expect(result[0].stores.map((store) => store.id)).toEqual(["coffee"]);
  });
});
