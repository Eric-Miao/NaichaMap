import { describe, expect, it, vi } from "vitest";

import { createNearbyService, type NearbyDependencies } from "../../src/features/nearby/service";

const point = { lng: 121.4737, lat: 31.2304 };
const dbStore = {
  store_id: "store-1",
  provider: "amap",
  provider_place_id: "poi-1",
  name: "喜茶",
  branch_name: "来福士店",
  category: "tea_drink" as const,
  address: "西藏中路268号",
  mall_id: "mall-1",
  mall_name: "上海来福士广场",
  mall_address: "西藏中路268号",
  longitude: 121.475,
  latitude: 31.232,
  distance_m: 220,
};

const normalizedPoi = {
  provider: "amap" as const,
  providerPlaceId: "poi-1",
  name: "喜茶（来福士店）",
  canonicalName: "喜茶",
  branchName: "来福士店",
  brandId: null,
  category: "tea_drink" as const,
  address: "上海来福士广场",
  gcj02: { lng: 121.48, lat: 31.23 },
  wgs84: { lng: 121.475, lat: 31.232 },
  providerParentId: "mall-provider-1",
};

function dependencies(overrides: Partial<NearbyDependencies> = {}): NearbyDependencies {
  return {
    now: () => new Date("2026-10-26T00:00:00Z"),
    sleep: vi.fn(async () => {}),
    repository: {
      getNearby: vi.fn(async () => [dbStore]),
      getCacheState: vi.fn(async () => ({
        fetchStatus: "succeeded" as const,
        expiresAt: "2026-11-01T00:00:00Z",
      })),
      claimSearchArea: vi.fn(),
      finishSearchArea: vi.fn(),
      saveMalls: vi.fn(async () => []),
      saveStores: vi.fn(async () => {}),
      markPossiblyClosed: vi.fn(async () => {}),
      listMallCandidates: vi.fn(async () => []),
    },
    provider: {
      searchBeverages: vi.fn(async () => [normalizedPoi]),
      searchMalls: vi.fn(async () => []),
    },
    diagnostic: vi.fn(),
    ...overrides,
  };
}

describe("createNearbyService", () => {
  it("returns fresh cached rows without calling AMap", async () => {
    const deps = dependencies();
    const result = await createNearbyService(deps)(point);

    expect(result.cacheStatus).toBe("fresh");
    expect(result.groups[0]).toMatchObject({ kind: "mall", id: "mall-1" });
    expect(deps.provider.searchBeverages).not.toHaveBeenCalled();
    expect(deps.repository.claimSearchArea).not.toHaveBeenCalled();
  });

  it("refreshes a cold cell and de-duplicates POIs", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getCacheState).mockResolvedValueOnce(null);
    vi.mocked(deps.repository.getNearby)
      .mockResolvedValueOnce([{ ...dbStore, provider_place_id: "old-poi" }])
      .mockResolvedValueOnce([dbStore]);
    vi.mocked(deps.repository.claimSearchArea).mockResolvedValueOnce({
      shouldFetch: true,
      leaseToken: "lease-1",
      hasStaleData: true,
    });
    vi.mocked(deps.provider.searchBeverages).mockResolvedValueOnce([normalizedPoi, normalizedPoi]);

    const result = await createNearbyService(deps)(point);

    expect(result.cacheStatus).toBe("refreshed");
    expect(deps.repository.saveStores).toHaveBeenCalledWith([normalizedPoi], []);
    expect(deps.repository.finishSearchArea).toHaveBeenCalledWith("lease-1", 1, true);
    expect(vi.mocked(deps.repository.saveStores).mock.calls[0][0][0]).not.toHaveProperty("manualLockFields");
  });

  it("does not infer closures from a non-authoritative provider refresh", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getCacheState).mockResolvedValueOnce(null);
    vi.mocked(deps.repository.getNearby)
      .mockResolvedValueOnce([{ ...dbStore, provider_place_id: "old-poi" }])
      .mockResolvedValueOnce([dbStore]);
    vi.mocked(deps.repository.claimSearchArea).mockResolvedValueOnce({
      shouldFetch: true,
      leaseToken: "lease-1",
      hasStaleData: true,
    });

    await createNearbyService(deps)(point);

    expect(deps.repository.markPossiblyClosed).not.toHaveBeenCalled();
  });

  it("returns stale cached data when AMap refresh fails", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getCacheState).mockResolvedValueOnce({
      fetchStatus: "succeeded",
      expiresAt: "2026-10-01T00:00:00Z",
    });
    vi.mocked(deps.repository.claimSearchArea).mockResolvedValueOnce({
      shouldFetch: true,
      leaseToken: "lease-1",
      hasStaleData: true,
    });
    vi.mocked(deps.provider.searchBeverages).mockRejectedValueOnce(new Error("provider down"));

    const result = await createNearbyService(deps)(point);

    expect(result.cacheStatus).toBe("stale");
    expect(result.groups).toHaveLength(1);
    expect(deps.repository.finishSearchArea).toHaveBeenCalledWith("lease-1", 0, false);
  });

  it("throws a stable error when AMap fails without cached data", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getNearby).mockResolvedValueOnce([]);
    vi.mocked(deps.repository.getCacheState).mockResolvedValueOnce(null);
    vi.mocked(deps.repository.claimSearchArea).mockResolvedValueOnce({
      shouldFetch: true,
      leaseToken: "lease-1",
      hasStaleData: false,
    });
    vi.mocked(deps.provider.searchBeverages).mockRejectedValueOnce(new Error("provider down"));

    await expect(createNearbyService(deps)(point)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });

  it("returns beverages when mall lookup fails", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getNearby)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...dbStore, mall_id: null, mall_name: null, mall_address: null }]);
    vi.mocked(deps.repository.getCacheState).mockResolvedValueOnce(null);
    vi.mocked(deps.repository.claimSearchArea).mockResolvedValueOnce({
      shouldFetch: true,
      leaseToken: "lease-1",
      hasStaleData: false,
    });
    vi.mocked(deps.provider.searchMalls).mockRejectedValueOnce(
      Object.assign(new Error("coordinates=121.4,31.2 key=secret-key"), { code: "AMAP_TIMEOUT" }),
    );
    vi.mocked(deps.repository.listMallCandidates).mockResolvedValueOnce([
      {
        id: "cached-mall",
        providerPlaceId: "cached-provider-mall",
        name: "旧商场边界",
        address: "测试地址",
        location: point,
        boundary: [
          { lng: point.lng - 0.001, lat: point.lat - 0.001 },
          { lng: point.lng + 0.001, lat: point.lat - 0.001 },
          { lng: point.lng + 0.001, lat: point.lat + 0.001 },
          { lng: point.lng - 0.001, lat: point.lat + 0.001 },
        ],
      },
    ]);

    const result = await createNearbyService(deps)(point);

    expect(result).toMatchObject({ cacheStatus: "refreshed", currentMall: null });
    expect(result.groups[0]).toMatchObject({ kind: "street" });
    expect(deps.repository.saveMalls).toHaveBeenCalledWith([]);
    expect(deps.repository.saveStores).toHaveBeenCalledWith([normalizedPoi], []);
    expect(deps.repository.finishSearchArea).toHaveBeenCalledWith("lease-1", 1, true);
    expect(deps.diagnostic).toHaveBeenCalledWith({ stage: "malls", code: "AMAP_TIMEOUT" });
  });

  it("waits for a winning concurrent refresh", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getCacheState)
      .mockResolvedValueOnce({ fetchStatus: "fetching", expiresAt: null })
      .mockResolvedValueOnce({ fetchStatus: "succeeded", expiresAt: "2026-11-01T00:00:00Z" });
    vi.mocked(deps.repository.getNearby).mockResolvedValueOnce([]).mockResolvedValueOnce([dbStore]);

    const result = await createNearbyService(deps)(point);

    expect(result.cacheStatus).toBe("refreshed");
    expect(deps.sleep).toHaveBeenCalled();
    expect(deps.provider.searchBeverages).not.toHaveBeenCalled();
  });

  it("returns a stable empty fresh result", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.getNearby).mockResolvedValueOnce([]);

    await expect(createNearbyService(deps)(point)).resolves.toEqual({
      currentMall: null,
      groups: [],
      cacheStatus: "fresh",
    });
  });
});
