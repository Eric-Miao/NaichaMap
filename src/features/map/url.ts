import type { GroupFilter, MapFilter } from "./reducer";

export type UrlView = {
  mode: "app" | "search";
  lat: number | null;
  lng: number | null;
  place: string | null;
  filter: MapFilter;
  group: GroupFilter;
  selected: string | null;
  drawer: boolean;
};

export const emptyUrlView: UrlView = {
  mode: "app",
  lat: null,
  lng: null,
  place: null,
  filter: "all",
  group: "all",
  selected: null,
  drawer: false,
};

const FILTERS: MapFilter[] = ["all", "tea_drink", "coffee"];

function finite(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= 180 ? number : null;
}

/** Parse a shareable view from a location search string. Invalid values fall back safely. */
export function parseUrl(search: string): UrlView {
  const params = new URLSearchParams(search);
  if (params.get("mode") === "search") {
    return { ...emptyUrlView, mode: "search" };
  }

  const lat = finite(params.get("lat"));
  const lng = finite(params.get("lng"));
  const filterValue = params.get("filter");
  const filter = FILTERS.includes(filterValue as MapFilter) ? (filterValue as MapFilter) : "all";
  const place = params.get("place")?.trim().slice(0, 120) || null;
  const group = params.get("group")?.trim().slice(0, 120) || "all";
  const selected = params.get("selected")?.trim().slice(0, 120) || null;

  return {
    mode: "app",
    lat: lat !== null && Math.abs(lat) <= 90 ? lat : null,
    lng,
    place,
    filter,
    group,
    selected,
    drawer: params.get("drawer") === "1",
  };
}

/** Serialize only what the current view needs; the entry and search modes stay short. */
export function buildUrl(view: UrlView): string {
  if (view.mode === "search") return "?mode=search";

  const params = new URLSearchParams();
  if (view.lat !== null && view.lng !== null) {
    params.set("lat", view.lat.toFixed(6));
    params.set("lng", view.lng.toFixed(6));
  }
  if (view.place) params.set("place", view.place);
  if (view.filter !== "all") params.set("filter", view.filter);
  if (view.group !== "all") params.set("group", view.group);
  if (view.selected) params.set("selected", view.selected);
  if (view.drawer) params.set("drawer", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function locationKey(lat: number, lng: number) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}
