"use client";

import { useRef } from "react";

import type { StoreGroup as StoreGroupType } from "@/features/nearby/contracts";
import type { MapFilter } from "@/features/map/reducer";

import styles from "../map/map-ui.module.css";
import { CategoryTabs } from "./category-tabs";
import { StoreGroup } from "./store-group";

function visibleGroups(groups: StoreGroupType[], filter: MapFilter) {
  if (filter === "all") return groups;
  return groups.flatMap((group) => {
    const stores = group.stores.filter((store) =>
      filter === "tea_drink" ? store.category !== "coffee" : store.category === "coffee",
    );
    return stores.length ? [{ ...group, stores } as StoreGroupType] : [];
  });
}

export function StoreDrawer({
  groups,
  filter,
  selectedId,
  expanded,
  onExpandedChange,
  onFilterChange,
  onSelectGroup,
  onSelectStore,
}: {
  groups: StoreGroupType[];
  filter: MapFilter;
  selectedId: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onFilterChange: (filter: MapFilter) => void;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const touchStartY = useRef<number | null>(null);
  const filtered = visibleGroups(groups, filter);
  const count = groups.reduce((total, group) => total + group.stores.length, 0);

  return (
    <aside className={styles.drawer} data-state={expanded ? "expanded" : "collapsed"} data-testid="store-drawer">
      <button
        type="button"
        className={styles.drawerHandle}
        aria-label={expanded ? "收起门店列表" : "展开门店列表"}
        onClick={() => onExpandedChange(!expanded)}
        onTouchStart={(event) => {
          touchStartY.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartY.current;
          const end = event.changedTouches[0]?.clientY;
          touchStartY.current = null;
          if (start == null || end == null) return;
          if (start - end > 30) onExpandedChange(true);
          if (end - start > 30) onExpandedChange(false);
        }}
      />
      <div className={styles.drawerHeading}>
        <h2>附近好喝的</h2>
        <span>{count} 家</span>
      </div>
      <CategoryTabs groups={groups} value={filter} onChange={onFilterChange} />
      <div className={styles.list}>
        {filtered.map((group) => (
          <StoreGroup
            key={group.id}
            group={group}
            selectedId={selectedId}
            onSelectGroup={onSelectGroup}
            onSelectStore={onSelectStore}
          />
        ))}
      </div>
    </aside>
  );
}
