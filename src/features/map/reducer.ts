import type { NearbyErrorBody, NearbyResponse } from "@/features/nearby/contracts";

export type MapStatus =
  | "permission"
  | "locating"
  | "loading-cache"
  | "refreshing"
  | "ready-mall"
  | "ready-nearby"
  | "denied"
  | "unavailable"
  | "empty"
  | "stale"
  | "error";

export type MapFilter = "all" | "tea_drink" | "coffee";
export type GroupFilter = "all" | string;

export type MapState = {
  status: MapStatus;
  filter: MapFilter;
  groupFilter: GroupFilter;
  drawerOpen: boolean;
  selectedId: string | null;
  data: NearbyResponse | null;
  error: NearbyErrorBody["error"] | null;
  correction: {
    status: "idle" | "success" | "rate-limited";
    retryAfterSeconds: number | null;
  };
};

export type MapAction =
  | { type: "REQUEST_LOCATION" }
  | { type: "LOCATION_DENIED" }
  | { type: "LOCATION_UNAVAILABLE" }
  | { type: "LOAD_START" }
  | { type: "REFRESH_START" }
  | { type: "LOAD_SUCCESS"; payload: NearbyResponse }
  | { type: "LOAD_ERROR"; error: NearbyErrorBody["error"] }
  | { type: "SET_FILTER"; filter: MapFilter }
  | { type: "SET_GROUP_FILTER"; groupFilter: GroupFilter }
  | { type: "SELECT"; id: string | null }
  | { type: "SET_DRAWER"; open: boolean }
  | { type: "CORRECTION_SUCCESS" }
  | { type: "CORRECTION_RATE_LIMITED"; retryAfterSeconds: number };

export const initialMapState: MapState = {
  status: "permission",
  filter: "all",
  groupFilter: "all",
  drawerOpen: true,
  selectedId: null,
  data: null,
  error: null,
  correction: { status: "idle", retryAfterSeconds: null },
};

export function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case "REQUEST_LOCATION":
      return { ...state, status: "locating", error: null };
    case "LOCATION_DENIED":
      return { ...state, status: "denied" };
    case "LOCATION_UNAVAILABLE":
      return { ...state, status: "unavailable" };
    case "LOAD_START":
      return { ...state, status: "loading-cache", error: null };
    case "REFRESH_START":
      return { ...state, status: "refreshing", error: null };
    case "LOAD_SUCCESS": {
      const status: MapStatus =
        action.payload.cacheStatus === "stale"
          ? "stale"
          : action.payload.currentMall
              ? "ready-mall"
              : action.payload.groups.length === 0
                ? "empty"
                : "ready-nearby";
      return { ...state, status, data: action.payload, groupFilter: "all", error: null };
    }
    case "LOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "SET_FILTER":
      return { ...state, filter: action.filter };
    case "SET_GROUP_FILTER":
      return { ...state, groupFilter: action.groupFilter, selectedId: null };
    case "SELECT":
      return { ...state, selectedId: action.id, drawerOpen: action.id ? true : state.drawerOpen };
    case "SET_DRAWER":
      return { ...state, drawerOpen: action.open };
    case "CORRECTION_SUCCESS":
      return { ...state, correction: { status: "success", retryAfterSeconds: null } };
    case "CORRECTION_RATE_LIMITED":
      return {
        ...state,
        correction: { status: "rate-limited", retryAfterSeconds: action.retryAfterSeconds },
      };
  }
}
