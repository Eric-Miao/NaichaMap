import "server-only";

import { AmapClient } from "@/lib/amap/client";
import type { NormalizedPlace, NormalizedPoi } from "@/lib/domain/store";
import {
  assertShanghaiLocation,
  wgs84ToGcj02,
  type GeoPoint,
} from "@/lib/geo/coordinates";
import { getSearchCell } from "@/lib/geo/grid";

import type {
  CacheState,
  NearbyInput,
  NearbyResponse,
  NearbyStoreRecord,
  SearchClaim,
} from "./contracts";
import { NearbyServiceError } from "./contracts";
import { groupStores } from "./grouping";
import type { NearbyRepository } from "./repository";
import { createNearbyRepository } from "./repository";

export { NearbyServiceError } from "./contracts";
export type { NearbyRepository } from "./repository";

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
  return (
    cache?.fetchStatus === "succeeded" &&
    Boolean(cache.expiresAt) &&
    new Date(cache.expiresAt!).getTime() > now.getTime()
  );
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
      return groupStores(rows, malls, point, {
        cacheStatus: "refreshed",
        cachedAt: state?.lastFetchedAt,
      });
    }
  }

  if (staleRows.length > 0) {
    const malls = await deps.repository.listMallCandidates();
    return groupStores(staleRows, malls, point, { cacheStatus: "stale" });
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
      return groupStores(initialRows, malls, input, {
        cacheStatus: "fresh",
        cachedAt: cache?.lastFetchedAt,
      });
    }

    if (cache?.fetchStatus === "fetching") {
      return waitForWinner(deps, cell.id, input, initialRows);
    }

    const claim: SearchClaim = await deps.repository.claimSearchArea(cell.id, cell.center, deps.now());
    if (!claim.shouldFetch || !claim.leaseToken) {
      return waitForWinner(deps, cell.id, input, initialRows);
    }

    let stage: NearbyDiagnostic["stage"] = "beverages";
    try {
      const providerCenter = wgs84ToGcj02(cell.center);
      const fetchedStores = await deps.provider.searchBeverages(providerCenter, cell.fetchRadiusM);
      stage = "malls";
      let mallLookupSucceeded = true;
      const fetchedMalls: NormalizedPlace[] = await deps.provider
        .searchMalls(providerCenter, cell.fetchRadiusM)
        .catch((error) => {
          mallLookupSucceeded = false;
          deps.diagnostic?.(toNearbyDiagnostic("malls", error));
          return [];
        });
      const stores: NormalizedPoi[] = [
        ...new Map(fetchedStores.map((store) => [store.providerPlaceId, store])).values(),
      ];
      stage = "persistence";
      const savedMalls = await deps.repository.saveMalls(fetchedMalls);
      const persistedMalls = await deps.repository.listMallCandidates();
      const currentMalls = [
        ...new Map([...persistedMalls, ...savedMalls].map((mall) => [mall.id, mall])).values(),
      ];
      await deps.repository.saveStores(stores, currentMalls);

      await deps.repository.finishSearchArea(cell.id, claim.leaseToken, stores.length, true);
      const refreshedRows = await deps.repository.getNearby(input);
      return groupStores(refreshedRows, currentMalls, input, {
        cacheStatus: "refreshed",
        allowCurrentMall: mallLookupSucceeded,
      });
    } catch (error) {
      deps.diagnostic?.(toNearbyDiagnostic(stage, error));
      try {
        await deps.repository.finishSearchArea(cell.id, claim.leaseToken, 0, false);
      } catch (finishError) {
        deps.diagnostic?.(toNearbyDiagnostic("finish", finishError));
      }
      if (initialRows.length > 0) {
        const malls = await deps.repository.listMallCandidates();
        return groupStores(initialRows, malls, input, {
          cacheStatus: "stale",
          cachedAt: cache?.lastFetchedAt,
        });
      }
      throw new NearbyServiceError("PROVIDER_UNAVAILABLE", "暂时无法刷新附近门店", true);
    }
  };
}

export async function getNearby(input: NearbyInput): Promise<NearbyResponse> {
  return createNearbyService({
    now: () => new Date(),
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    repository: createNearbyRepository(),
    provider: new AmapClient(),
    diagnostic: (event) => console.error("nearby_refresh_failed", event),
  })(input);
}
