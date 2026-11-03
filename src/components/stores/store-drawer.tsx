"use client";

import { useRef } from "react";

import type { GroupFilter, MapFilter } from "@/features/map/reducer";
import type { DirectoryView } from "@/features/map/selectors";

import styles from "../map/map-ui.module.css";
import { CategoryTabs } from "./category-tabs";
import { LocationTabs } from "./location-tabs";
import { StoreGroup } from "./store-group";

export function StoreDrawer({
  view,
  filter,
  groupFilter,
  selectedId,
  expanded,
  onExpandedChange,
  onFilterChange,
  onGroupFilterChange,
  onSelectGroup,
  onSelectStore,
  onCorrection,
}: {
  view: DirectoryView;
  filter: MapFilter;
  groupFilter: GroupFilter;
  selectedId: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onFilterChange: (filter: MapFilter) => void;
  onGroupFilterChange: (filter: GroupFilter) => void;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
  onCorrection: () => void;
}) {
  const touchStartY = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const isEmpty = view.locations.length === 0;

  return (
    <aside
      className={styles.drawer}
      data-state={expanded ? "expanded" : "collapsed"}
      data-testid="store-drawer"
    >
      <button
        type="button"
        className={styles.drawerHandle}
        aria-label={expanded ? "收起门店列表" : "展开门店列表"}
        aria-expanded={expanded}
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
      >
        <span className={styles.drawerBar} aria-hidden="true" />
      </button>

      <div className={styles.drawerHeading}>
        <div>
          <h2>门店目录</h2>
          <p>按商场分组 · 数字对应地图标记</p>
        </div>
        <span className={styles.drawerCount}>{String(view.totalStores).padStart(2, "0")}</span>
      </div>

      {isEmpty ? (
        <div className={styles.emptyWide}>
          <p className={styles.emptyTitle}>附近暂时没有记录</p>
          <p>地图仍显示你的位置。如果你知道这里有新店，可以帮我们补充。</p>
          <button type="button" className={styles.emptyAction} onClick={onCorrection}>
            补充遗漏门店
          </button>
        </div>
      ) : (
        <>
          <div className={styles.filters}>
            <LocationTabs
              options={view.locations}
              total={view.locationTotal}
              value={groupFilter}
              onChange={onGroupFilterChange}
            />
            <CategoryTabs counts={view.categories} value={filter} onChange={onFilterChange} />
          </div>

          <div className={styles.list}>
            {view.groups.length === 0 ? (
              <div className={styles.empty} role="status">
                <p>这个筛选下没有门店</p>
                <button
                  type="button"
                  className={styles.emptyAction}
                  onClick={() => {
                    onFilterChange("all");
                    onGroupFilterChange("all");
                  }}
                >
                  清除筛选
                </button>
              </div>
            ) : (
              view.groups.map((group) => (
                <StoreGroup
                  key={group.id}
                  group={group}
                  range={view.rangeByGroupId[group.id]}
                  indexes={view.indexByStoreId}
                  isCurrent={group.id === view.currentMallId}
                  selectedId={selectedId}
                  onSelectGroup={onSelectGroup}
                  onSelectStore={onSelectStore}
                />
              ))
            )}
          </div>
        </>
      )}

      <footer className={styles.drawerFooter}>
        门店 © 高德地图 · 底图版权见地图角标
      </footer>
    </aside>
  );
}
