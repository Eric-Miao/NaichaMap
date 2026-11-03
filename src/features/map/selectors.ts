import type { StoreGroup } from "@/features/nearby/contracts";

import type { GroupFilter, MapFilter } from "./reducer";

export function filterStoreGroups(
  groups: StoreGroup[],
  filter: MapFilter,
  groupFilter: GroupFilter = "all",
): StoreGroup[] {
  const locationGroups = groupFilter === "all"
    ? groups
    : groups.filter((group) => group.id === groupFilter);
  if (filter === "all") return locationGroups;

  return locationGroups.flatMap((group) => {
    const stores = group.stores.filter((store) =>
      filter === "tea_drink"
        ? store.category === "tea_drink" || store.category === "beverage"
        : store.category === "coffee",
    );
    return stores.length > 0 ? [{ ...group, stores } as StoreGroup] : [];
  });
}

export function groupLabel(group: StoreGroup) {
  return group.kind === "mall" ? group.mall.name : "周边街铺";
}

export type IndexRange = { start: string; end: string; count: number };

export type DirectoryView = {
  /** Groups and stores after both filters. */
  groups: StoreGroup[];
  totalStores: number;
  /** Location rail options, counted against the active category filter. */
  locations: Array<{ id: string; label: string; count: number }>;
  locationTotal: number;
  /** Category counts, counted against the active location filter. */
  categories: Record<MapFilter, number>;
  /** Directory number for every visible store, shared with its map marker. */
  indexByStoreId: Record<string, string>;
  /** Directory number range for every visible group. */
  rangeByGroupId: Record<string, IndexRange>;
  currentMallId: string | null;
  filtered: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * One source of truth for the directory sheet and the map: which groups are
 * visible, how many stores each filter option holds, and the number that ties a
 * list row to its marker.
 */
export function buildDirectoryView(
  groups: StoreGroup[],
  filter: MapFilter,
  groupFilter: GroupFilter = "all",
  currentMallId: string | null = null,
): DirectoryView {
  const visible = filterStoreGroups(groups, filter, groupFilter);
  const categoryScoped = filterStoreGroups(groups, "all", groupFilter);
  const locationScoped = filterStoreGroups(groups, filter);

  const locations = groups.map((group) => {
    const match = locationScoped.find((candidate) => candidate.id === group.id);
    return {
      id: group.id,
      label: groupLabel(group),
      count: match?.stores.length ?? 0,
    };
  });
  const locationTotal = locationScoped.reduce((total, group) => total + group.stores.length, 0);

  const stores = categoryScoped.flatMap((group) => group.stores);
  const categories: Record<MapFilter, number> = {
    all: stores.length,
    tea_drink: stores.filter((store) => store.category !== "coffee").length,
    coffee: stores.filter((store) => store.category === "coffee").length,
  };

  const indexByStoreId: Record<string, string> = {};
  const rangeByGroupId: Record<string, IndexRange> = {};
  let cursor = 0;
  for (const group of visible) {
    const start = cursor + 1;
    for (const store of group.stores) {
      cursor += 1;
      indexByStoreId[store.id] = pad(cursor);
    }
    rangeByGroupId[group.id] = {
      start: pad(start),
      end: pad(cursor),
      count: group.stores.length,
    };
  }

  return {
    groups: visible,
    totalStores: cursor,
    locations,
    locationTotal,
    categories,
    indexByStoreId,
    rangeByGroupId,
    currentMallId,
    filtered: filter !== "all" || groupFilter !== "all",
  };
}
