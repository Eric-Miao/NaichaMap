import "server-only";

import { AmapClient } from "@/lib/amap/client";
import type { NormalizedPlace, NormalizedPoi, StoreCategory } from "@/lib/domain/store";
import {
  assertShanghaiLocation,
  wgs84ToGcj02,
  type GeoPoint,
} from "@/lib/geo/coordinates";
import { getSearchCell } from "@/lib/geo/grid";
import { createAdminClient } from "@/lib/supabase/server";

import type { CacheStatus, MallSummary, NearbyInput, NearbyResponse, StoreGroup } from "./contracts";
import { NearbyServiceError } from "./contracts";
import {
  distanceMeters,
  resolveCurrentMall,
  resolveMallForStore,
  type MallCandidate,
} from "./mall-confidence";

export { NearbyServiceError } from "./contracts";

export type NearbyStoreRecord = {
  store_id: string;
  provider: string;
  provider_place_id: string;
  name: string;
  branch_name: string | null;
  category: StoreCategory;
  address: string;
  mall_id: string | null;
  mall_name: string | null;
  mall_address: string | null;
  longitude: number;
  latitude: number;
  distance_m: number;
};

type CacheState = {
  fetchStatus: "idle" | "fetching" | "succeeded" | "failed";
  expiresAt: string | null;
  lastFetchedAt?: string | null;
};
type SearchClaim = { shouldFetch: boolean; leaseToken: string | null; hasStaleData: boolean };

export type NearbyRepository = {
  getNearby(point: GeoPoint): Promise<NearbyStoreRecord[]>;
  getCacheState(cellId: string): Promise<CacheState | null>;
  claimSearchArea(cellId: string, center: GeoPoint, now: Date): Promise<SearchClaim>;
  finishSearchArea(leaseToken: string, resultCount: number, success: boolean): Promise<void>;
  saveMalls(malls: NormalizedPlace[]): Promise<MallCandidate[]>;
  saveStores(stores: NormalizedPoi[], malls: MallCandidate[]): Promise<void>;
  markPossiblyClosed(providerPlaceIds: string[]): Promise<void>;
  listMallCandidates(): Promise<MallCandidate[]>;
};

export type NearbyDependencies = {
  now: () => Date;
  sleep: (milliseconds: number) => Promise<void>;
  repository: NearbyRepository;
  provider: Pick<AmapClient, "searchBeverages" | "searchMalls">;
  diagnostic?: (event: NearbyDiagnostic) => void;
};

export type NearbyDiagnostic = {
  stage: "beverages" | "malls" | "persistence" | "finish";
  code: string;
};

export function toNearbyDiagnostic(stage: NearbyDiagnostic["stage"], error: unknown): NearbyDiagnostic {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code)
    : "UNKNOWN";
  return { stage, code: /^[A-Z0-9_]{2,40}$/.test(code) ? code : "UNKNOWN" };
}

function isFresh(cache: CacheState | null, now: Date) {
  return cache?.fetchStatus === "succeeded" && Boolean(cache.expiresAt) && new Date(cache.expiresAt!).getTime() > now.getTime();
}

function groupStores(
  rows: NearbyStoreRecord[],
  malls: MallCandidate[],
  point: GeoPoint,
  cacheStatus: CacheStatus,
  cachedAt?: string | null,
  allowCurrentMall = true,
): NearbyResponse {
  const currentCandidate = allowCurrentMall ? resolveCurrentMall(point, malls) : null;
  const currentMall: MallSummary | null = currentCandidate
    ? {
        id: currentCandidate.id,
        name: currentCandidate.name,
        address: currentCandidate.address,
        distanceM: Math.round(distanceMeters(point, currentCandidate.location)),
      }
    : null;

  const mallGroups = new Map<string, { mall: MallSummary; stores: NearbyStoreRecord[] }>();
  const streetRows: NearbyStoreRecord[] = [];
  for (const row of rows) {
    if (!row.mall_id || !row.mall_name) {
      streetRows.push(row);
      continue;
    }
    const group = mallGroups.get(row.mall_id) ?? {
      mall: {
        id: row.mall_id,
        name: row.mall_name,
        address: row.mall_address ?? "",
        distanceM: Math.round(row.distance_m),
      },
      stores: [],
    };
    group.mall.distanceM = Math.min(group.mall.distanceM, Math.round(row.distance_m));
    group.stores.push(row);
    mallGroups.set(row.mall_id, group);
  }

  const toStore = (row: NearbyStoreRecord) => ({
    id: row.store_id,
    name: row.name,
    branchName: row.branch_name,
    category: row.category,
    address: row.address,
    mallId: row.mall_id,
    location: { lng: row.longitude, lat: row.latitude },
    distanceM: Math.round(row.distance_m),
  });

  const groups: StoreGroup[] = [...mallGroups.values()]
    .sort((first, second) => {
      if (first.mall.id === currentMall?.id) return -1;
      if (second.mall.id === currentMall?.id) return 1;
      return first.mall.distanceM - second.mall.distanceM;
    })
    .map(({ mall, stores }) => ({
      kind: "mall" as const,
      id: mall.id,
      mall,
      stores: stores.sort((a, b) => a.distance_m - b.distance_m).map(toStore),
    }));

  if (streetRows.length > 0) {
    groups.push({
      kind: "street",
      id: "street",
      mall: null,
      stores: streetRows.sort((a, b) => a.distance_m - b.distance_m).map(toStore),
    });
  }

  return {
    currentMall,
    groups,
    cacheStatus,
    ...(cachedAt ? { cachedAt } : {}),
  };
}

async function waitForWinner(
  deps: NearbyDependencies,
  cellId: string,
  point: GeoPoint,
  staleRows: NearbyStoreRecord[],
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await deps.sleep(1000);
    const state = await deps.repository.getCacheState(cellId);
    if (isFresh(state, deps.now())) {
      const rows = await deps.repository.getNearby(point);
      const malls = await deps.repository.listMallCandidates();
      return groupStores(rows, malls, point, "refreshed", state?.lastFetchedAt);
    }
  }

  if (staleRows.length > 0) {
    const malls = await deps.repository.listMallCandidates();
    return groupStores(staleRows, malls, point, "stale");
  }
  throw new NearbyServiceError("CACHE_REFRESHING", "附近门店正在刷新，请稍后重试", true);
}

export function createNearbyService(deps: NearbyDependencies) {
  return async function nearby(input: NearbyInput): Promise<NearbyResponse> {
    assertShanghaiLocation(input);
    const cell = getSearchCell(input);
    const initialRows = await deps.repository.getNearby(input);
    const cache = await deps.repository.getCacheState(cell.id);

    if (isFresh(cache, deps.now())) {
      const malls = await deps.repository.listMallCandidates();
      return groupStores(initialRows, malls, input, "fresh", cache?.lastFetchedAt);
    }

    if (cache?.fetchStatus === "fetching") {
      return waitForWinner(deps, cell.id, input, initialRows);
    }

    const claim = await deps.repository.claimSearchArea(cell.id, cell.center, deps.now());
    if (!claim.shouldFetch || !claim.leaseToken) {
      return waitForWinner(deps, cell.id, input, initialRows);
    }

    let stage: NearbyDiagnostic["stage"] = "beverages";
    try {
      const providerCenter = wgs84ToGcj02(cell.center);
      const fetchedStores = await deps.provider.searchBeverages(providerCenter, cell.fetchRadiusM);
      stage = "malls";
      let mallLookupSucceeded = true;
      const fetchedMalls = await deps.provider.searchMalls(providerCenter, cell.fetchRadiusM).catch((error) => {
        mallLookupSucceeded = false;
        deps.diagnostic?.(toNearbyDiagnostic("malls", error));
        return [];
      });
      const stores = [...new Map(fetchedStores.map((store) => [store.providerPlaceId, store])).values()];
      stage = "persistence";
      await deps.repository.saveMalls(fetchedMalls);
      const currentMalls = await deps.repository.listMallCandidates();
      await deps.repository.saveStores(stores, currentMalls);

      await deps.repository.finishSearchArea(claim.leaseToken, stores.length, true);
      const refreshedRows = await deps.repository.getNearby(input);
      return groupStores(refreshedRows, currentMalls, input, "refreshed", undefined, mallLookupSucceeded);
    } catch (error) {
      deps.diagnostic?.(toNearbyDiagnostic(stage, error));
      try {
        await deps.repository.finishSearchArea(claim.leaseToken, 0, false);
      } catch (finishError) {
        deps.diagnostic?.(toNearbyDiagnostic("finish", finishError));
      }
      if (initialRows.length > 0) {
        const malls = await deps.repository.listMallCandidates();
        return groupStores(initialRows, malls, input, "stale", cache?.lastFetchedAt);
      }
      throw new NearbyServiceError("PROVIDER_UNAVAILABLE", "暂时无法刷新附近门店", true);
    }
  };
}

function parsePoint(value: unknown): GeoPoint | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [lng, lat] = coordinates.map(Number);
      if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
    }
  }
  return null;
}

function parseBoundary(value: unknown): GeoPoint[] | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const rings = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(rings) && Array.isArray(rings[0])) {
      const points = (rings[0] as unknown[])
        .map((coordinate) =>
          Array.isArray(coordinate) ? { lng: Number(coordinate[0]), lat: Number(coordinate[1]) } : null,
        )
        .filter((point): point is GeoPoint => Boolean(point && Number.isFinite(point.lng) && Number.isFinite(point.lat)));
      return points.length >= 3 ? points : null;
    }
  }
  return null;
}

function createRepository(): NearbyRepository {
  const client = createAdminClient();
  let activeCellId = "";

  return {
    async getNearby(point) {
      const { data, error } = await client.rpc("nearby_stores", {
        p_lng: point.lng,
        p_lat: point.lat,
        p_radius_m: 1000,
      });
      if (error) throw error;
      return data as NearbyStoreRecord[];
    },
    async getCacheState(cellId) {
      activeCellId = cellId;
      const { data, error } = await client
        .from("search_areas")
        .select("fetch_status,expires_at,last_fetched_at")
        .eq("cell_id", cellId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            fetchStatus: data.fetch_status,
            expiresAt: data.expires_at,
            lastFetchedAt: data.last_fetched_at,
          }
        : null;
    },
    async claimSearchArea(cellId, center, now) {
      activeCellId = cellId;
      const { data, error } = await client.rpc("claim_search_area", {
        p_cell_id: cellId,
        p_center_lng: center.lng,
        p_center_lat: center.lat,
        p_now: now.toISOString(),
      });
      if (error) throw error;
      const claim = data[0];
      return {
        shouldFetch: claim.should_fetch,
        leaseToken: claim.lease_token,
        hasStaleData: claim.has_stale_data,
      };
    },
    async finishSearchArea(leaseToken, resultCount, success) {
      const { error } = await client.rpc("finish_search_area", {
        p_cell_id: activeCellId,
        p_lease_token: leaseToken,
        p_result_count: resultCount,
        p_success: success,
      });
      if (error) throw error;
    },
    async saveMalls(malls) {
      if (malls.length === 0) return [];
      const { data, error } = await client
        .from("malls")
        .upsert(
          malls.map((mall) => ({
            provider: "amap",
            provider_place_id: mall.providerPlaceId,
            name: mall.name,
            address: mall.address,
            location_gcj02_lng: mall.gcj02.lng,
            location_gcj02_lat: mall.gcj02.lat,
            location_wgs84: `POINT(${mall.wgs84.lng} ${mall.wgs84.lat})`,
            last_seen_at: new Date().toISOString(),
          })),
          { onConflict: "provider,provider_place_id" },
        )
        .select("id,provider_place_id,name,address,location_wgs84,boundary_wgs84");
      if (error) throw error;
      return data.map((mall) => ({
        id: mall.id,
        providerPlaceId: mall.provider_place_id,
        name: mall.name,
        address: mall.address,
        location: parsePoint(mall.location_wgs84) ?? { lng: 0, lat: 0 },
        boundary: parseBoundary(mall.boundary_wgs84),
      }));
    },
    async saveStores(stores, malls) {
      if (stores.length === 0) return;
      const { error } = await client.from("stores").upsert(
        stores.map((store) => {
          const mall = resolveMallForStore(
            {
              providerParentId: store.providerParentId,
              name: store.name,
              address: store.address,
              location: store.wgs84,
            },
            malls,
          );
          return {
            provider: "amap",
            provider_place_id: store.providerPlaceId,
            brand_id: store.brandId,
            name: store.canonicalName,
            branch_name: store.branchName,
            category: store.category,
            address: store.address,
            mall_id: mall?.id ?? null,
            location_gcj02_lng: store.gcj02.lng,
            location_gcj02_lat: store.gcj02.lat,
            location_wgs84: `POINT(${store.wgs84.lng} ${store.wgs84.lat})`,
            status: "active" as const,
            last_seen_at: new Date().toISOString(),
          };
        }),
        { onConflict: "provider,provider_place_id" },
      );
      if (error) throw error;
    },
    async markPossiblyClosed(providerPlaceIds) {
      if (providerPlaceIds.length === 0) return;
      const { error } = await client
        .from("stores")
        .update({ status: "possibly_closed" })
        .eq("provider", "amap")
        .in("provider_place_id", providerPlaceIds);
      if (error) throw error;
    },
    async listMallCandidates() {
      const { data, error } = await client
        .from("malls")
        .select("id,provider_place_id,name,address,location_wgs84,boundary_wgs84");
      if (error) throw error;
      return data
        .map((mall) => {
          const location = parsePoint(mall.location_wgs84);
          return location
            ? {
                id: mall.id,
                providerPlaceId: mall.provider_place_id,
                name: mall.name,
                address: mall.address,
                location,
                boundary: parseBoundary(mall.boundary_wgs84),
              }
            : null;
        })
        .filter((mall): mall is MallCandidate => mall !== null);
    },
  };
}

export async function getNearby(input: NearbyInput): Promise<NearbyResponse> {
  return createNearbyService({
    now: () => new Date(),
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    repository: createRepository(),
    provider: new AmapClient(),
    diagnostic: (event) => console.error("nearby_refresh_failed", event),
  })(input);
}
