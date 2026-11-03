import type { GeoPoint } from "@/lib/geo/coordinates";

import type {
  CacheStatus,
  MallSummary,
  NearbyResponse,
  NearbyStoreRecord,
  StoreGroup,
} from "./contracts";
import { distanceMeters, resolveCurrentMall, type MallCandidate } from "./mall-confidence";

export type GroupOptions = {
  cacheStatus: CacheStatus;
  cachedAt?: string | null;
  /** False when the mall lookup failed: do not claim a current mall from incomplete data. */
  allowCurrentMall?: boolean;
};

/**
 * Turn flat cached rows into the directory response: mall sections ordered by
 * distance (current mall first) and one trailing street section. Pure and
 * independent of Supabase or AMap.
 */
export function groupStores(
  rows: NearbyStoreRecord[],
  malls: MallCandidate[],
  point: GeoPoint,
  { cacheStatus, cachedAt, allowCurrentMall = true }: GroupOptions,
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
