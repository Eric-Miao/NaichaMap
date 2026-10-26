import { describe, expect, it } from "vitest";

import { initialMapState, mapReducer } from "../../src/features/map/reducer";

const mallResponse = {
  currentMall: { id: "mall-1", name: "环贸iapm", address: "淮海中路", distanceM: 20 },
  groups: [],
  cacheStatus: "fresh" as const,
};

describe("mapReducer", () => {
  it("covers permission, locating and unavailable location states", () => {
    expect(initialMapState.status).toBe("permission");
    expect(mapReducer(initialMapState, { type: "REQUEST_LOCATION" }).status).toBe("locating");
    expect(mapReducer(initialMapState, { type: "LOCATION_DENIED" }).status).toBe("denied");
    expect(mapReducer(initialMapState, { type: "LOCATION_UNAVAILABLE" }).status).toBe("unavailable");
  });

  it("covers cache loading, provider refresh and mall results", () => {
    const loading = mapReducer(initialMapState, { type: "LOAD_START" });
    const refreshing = mapReducer(loading, { type: "REFRESH_START" });
    const ready = mapReducer(refreshing, { type: "LOAD_SUCCESS", payload: mallResponse });
    expect(loading.status).toBe("loading-cache");
    expect(refreshing.status).toBe("refreshing");
    expect(ready.status).toBe("ready-mall");
  });

  it("distinguishes nearby, empty and stale results", () => {
    const nearby = mapReducer(initialMapState, {
      type: "LOAD_SUCCESS",
      payload: { ...mallResponse, currentMall: null, groups: [{ kind: "street", id: "street", mall: null, stores: [] }] },
    });
    const empty = mapReducer(initialMapState, {
      type: "LOAD_SUCCESS",
      payload: { ...mallResponse, currentMall: null, groups: [] },
    });
    const stale = mapReducer(initialMapState, {
      type: "LOAD_SUCCESS",
      payload: { ...mallResponse, currentMall: null, cacheStatus: "stale" },
    });
    expect(nearby.status).toBe("ready-nearby");
    expect(empty.status).toBe("empty");
    expect(stale.status).toBe("stale");
  });

  it("stores recoverable errors and correction outcomes", () => {
    const failed = mapReducer(initialMapState, {
      type: "LOAD_ERROR",
      error: { code: "PROVIDER_UNAVAILABLE", message: "稍后重试", retryable: true },
    });
    const corrected = mapReducer(failed, { type: "CORRECTION_SUCCESS" });
    const limited = mapReducer(corrected, { type: "CORRECTION_RATE_LIMITED", retryAfterSeconds: 240 });
    expect(failed).toMatchObject({ status: "error", error: { retryable: true } });
    expect(corrected.correction).toEqual({ status: "success", retryAfterSeconds: null });
    expect(limited.correction).toEqual({ status: "rate-limited", retryAfterSeconds: 240 });
  });

  it("uses one canonical selected ID for markers, stores and groups", () => {
    const selectedMarker = mapReducer(initialMapState, { type: "SELECT", id: "store-1" });
    const selectedGroup = mapReducer(selectedMarker, { type: "SELECT", id: "mall-1" });
    expect(selectedMarker.selectedId).toBe("store-1");
    expect(selectedGroup.selectedId).toBe("mall-1");
    expect(mapReducer(selectedGroup, { type: "SET_DRAWER", open: false })).toMatchObject({
      drawerOpen: false,
      selectedId: "mall-1",
    });
  });
});
