import type { StoreGroup } from "@/features/nearby/contracts";

import type { MapState } from "./reducer";

export function selectVisibleGroups(state: MapState): StoreGroup[] {
  const groups = state.data?.groups ?? [];
  if (state.filter === "all") return groups;

  return groups.flatMap((group) => {
    const stores = group.stores.filter((store) =>
      state.filter === "tea_drink"
        ? store.category === "tea_drink" || store.category === "beverage"
        : store.category === "coffee",
    );
    return stores.length > 0 ? [{ ...group, stores } as StoreGroup] : [];
  });
}
