import "server-only";

import type { NormalizedPlace, NormalizedPoi, StoreCategory } from "@/lib/domain/store";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { parsePostgisPoint, parsePostgisPolygon } from "@/lib/geo/postgis";
import { collectAllPages } from "@/lib/supabase/pagination";
import { createAdminClient } from "@/lib/supabase/server";

import { NEARBY_RADIUS_M } from "@/lib/geo/search";

import type { CacheState, NearbyStoreRecord, SearchClaim } from "./contracts";
import { resolveMallForStore, type MallCandidate } from "./mall-confidence";

export type NearbyRepository = {
  getNearby(point: GeoPoint): Promise<NearbyStoreRecord[]>;
  getCacheState(cellId: string): Promise<CacheState | null>;
  claimSearchArea(cellId: string, center: GeoPoint, now: Date): Promise<SearchClaim>;
  finishSearchArea(cellId: string, leaseToken: string, resultCount: number, success: boolean): Promise<void>;
  saveMalls(malls: NormalizedPlace[]): Promise<MallCandidate[]>;
  saveStores(stores: NormalizedPoi[], malls: MallCandidate[]): Promise<void>;
  listMallCandidates(): Promise<MallCandidate[]>;
};

export type { NearbyStoreRecord };

/** Supabase/PostGIS adapter for the nearby service. */
export function createNearbyRepository(): NearbyRepository {
  const client = createAdminClient();

  return {
    async getNearby(point) {
      const { data, error } = await client.rpc("nearby_stores", {
        p_lng: point.lng,
        p_lat: point.lat,
        p_radius_m: NEARBY_RADIUS_M,
      });
      if (error) throw error;
      return data as NearbyStoreRecord[];
    },

    async getCacheState(cellId) {
      const { data, error } = await client
        .from("search_areas")
        .select("fetch_status,expires_at,last_fetched_at")
        .eq("cell_id", cellId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            fetchStatus: data.fetch_status as CacheState["fetchStatus"],
            expiresAt: data.expires_at,
            lastFetchedAt: data.last_fetched_at,
          }
        : null;
    },

    async claimSearchArea(cellId, center, now) {
      const { data, error } = await client.rpc("claim_search_area", {
        p_cell_id: cellId,
        p_center_lng: center.lng,
        p_center_lat: center.lat,
        p_now: now.toISOString(),
      });
      if (error) throw error;
      const claim = data[0];
      return { shouldFetch: claim.should_fetch, leaseToken: claim.lease_token };
    },

    async finishSearchArea(cellId, leaseToken, resultCount, success) {
      const { error } = await client.rpc("finish_search_area", {
        p_cell_id: cellId,
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
      return (data ?? []).map((mall) => ({
        id: mall.id,
        providerPlaceId: mall.provider_place_id,
        name: mall.name,
        address: mall.address,
        location: parsePostgisPoint(mall.location_wgs84) ?? { lng: 0, lat: 0 },
        boundary: parsePostgisPolygon(mall.boundary_wgs84),
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
            category: store.category as StoreCategory,
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

    async listMallCandidates() {
      const data = await collectAllPages(async (from, to) => {
        const { data: page, error } = await client
          .from("malls")
          .select("id,provider_place_id,name,address,location_wgs84,boundary_wgs84")
          .order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return page;
      });
      return data
        .map((mall) => {
          const location = parsePostgisPoint(mall.location_wgs84);
          return location
            ? {
                id: mall.id,
                providerPlaceId: mall.provider_place_id,
                name: mall.name,
                address: mall.address,
                location,
                boundary: parsePostgisPolygon(mall.boundary_wgs84),
              }
            : null;
        })
        .filter((mall): mall is MallCandidate => mall !== null);
    },
  };
}
