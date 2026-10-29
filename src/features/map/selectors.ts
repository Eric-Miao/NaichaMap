import type { StoreGroup } from "@/features/nearby/contracts";

import type { GroupFilter, MapFilter, MapState } from "./reducer";

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

export function selectVisibleGroups(state: MapState): StoreGroup[] {
  return filterStoreGroups(state.data?.groups ?? [], state.filter, state.groupFilter);
}
