"use client";

import { useRef } from "react";

import type { StoreGroup as StoreGroupType } from "@/features/nearby/contracts";
import type { GroupFilter, MapFilter } from "@/features/map/reducer";
import { filterStoreGroups } from "@/features/map/selectors";

import styles from "../map/map-ui.module.css";
import { CategoryTabs } from "./category-tabs";
import { LocationTabs } from "./location-tabs";
import { StoreGroup } from "./store-group";

export function StoreDrawer({
  groups,
  filter,
  groupFilter,
  selectedId,
  expanded,
  onExpandedChange,
  onFilterChange,
  onGroupFilterChange,
  onSelectGroup,
  onSelectStore,
}: {
  groups: StoreGroupType[];
  filter: MapFilter;
  groupFilter: GroupFilter;
  selectedId: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onFilterChange: (filter: MapFilter) => void;
  onGroupFilterChange: (filter: GroupFilter) => void;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const touchStartY = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const filtered = filterStoreGroups(groups, filter, groupFilter);
  const groupsForLocationCounts = filterStoreGroups(groups, filter);
  const groupsForCategoryCounts = filterStoreGroups(groups, "all", groupFilter);
  const count = groups.reduce((total, group) => total + group.stores.length, 0);

  return (
    <aside className={styles.drawer} data-state={expanded ? "expanded" : "collapsed"} data-testid="store-drawer">
      <button
        type="button"
        className={styles.drawerHandle}
        aria-label={expanded ? "收起门店列表" : "展开门店列表"}
        onClick={(event) => {
          if (suppressClick.current && event.detail > 0) {
            suppressClick.current = false;
            return;
          }
          suppressClick.current = false;
          onExpandedChange(!expanded);
        }}
        onTouchStart={(event) => {
          suppressClick.current = false;
          touchStartY.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartY.current;
          const end = event.changedTouches[0]?.clientY;
          touchStartY.current = null;
          if (start == null || end == null) return;
          if (Math.abs(end - start) <= 30) return;
          suppressClick.current = true;
          onExpandedChange(end < start);
        }}
        onTouchCancel={() => {
          touchStartY.current = null;
          suppressClick.current = false;
        }}
      />
      <div className={styles.drawerHeading}>
        <h2>附近好喝的</h2>
        <span>{count} 家</span>
      </div>
      <LocationTabs
        groups={groups}
        countGroups={groupsForLocationCounts}
        value={groupFilter}
        onChange={onGroupFilterChange}
      />
      <CategoryTabs groups={groupsForCategoryCounts} value={filter} onChange={onFilterChange} />
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
