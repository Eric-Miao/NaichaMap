import type { StoreCategory } from "@/lib/domain/store";
import type { GeoPoint } from "@/lib/geo/coordinates";

export type NearbyInput = GeoPoint;
export type CacheStatus = "fresh" | "refreshed" | "stale";

export type MallSummary = {
  id: string;
  name: string;
  address: string;
  distanceM: number;
};

export type StoreSummary = {
  id: string;
  name: string;
  branchName: string | null;
  category: StoreCategory;
  address: string;
  mallId: string | null;
  location: GeoPoint;
  distanceM: number;
};

export type StoreGroup =
  | { kind: "mall"; id: string; mall: MallSummary; stores: StoreSummary[] }
  | { kind: "street"; id: "street"; mall: null; stores: StoreSummary[] };

export type NearbyResponse = {
  currentMall: MallSummary | null;
  groups: StoreGroup[];
  cacheStatus: CacheStatus;
  cachedAt?: string;
};

export type NearbyErrorCode =
  | "INVALID_REQUEST"
  | "OUTSIDE_SHANGHAI"
  | "CACHE_REFRESHING"
  | "PROVIDER_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type NearbyErrorBody = {
  error: {
    code: NearbyErrorCode;
    message: string;
    retryable: boolean;
  };
};

export class NearbyServiceError extends Error {
  constructor(
    public readonly code: Exclude<NearbyErrorCode, "INVALID_REQUEST" | "OUTSIDE_SHANGHAI">,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "NearbyServiceError";
  }
}
