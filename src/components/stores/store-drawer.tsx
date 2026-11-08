"use client";

import { type CSSProperties, useRef, useState } from "react";

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
  const sheetRef = useRef<HTMLElement>(null);
  const dragStart = useRef<{ y: number; expanded: boolean; range: number } | null>(null);
  const suppressClick = useRef(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const isEmpty = view.locations.length === 0;

  function peekPx() {
    return Math.min(window.innerHeight * 0.6, 520);
  }

  return (
    <aside
      ref={sheetRef}
      className={styles.drawer}
      data-state={expanded ? "expanded" : "collapsed"}
      data-dragging={dragging ? "true" : undefined}
      data-testid="store-drawer"
      style={{ "--drag": `${dragY}px` } as CSSProperties}
    >
      <button
        type="button"
        className={styles.drawerHandle}
        aria-label={expanded ? "收起门店列表" : "展开门店列表"}
        aria-expanded={expanded}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onExpandedChange(!expanded);
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          suppressClick.current = false;
          dragStart.current = {
            y: touch.clientY,
            expanded,
            range: Math.max(0, (sheetRef.current?.offsetHeight ?? 0) - peekPx()),
          };
          setDragging(true);
          setDragY(0);
        }}
        onTouchMove={(event) => {
          const start = dragStart.current;
          const touch = event.touches[0];
          if (!start || !touch) return;
          const delta = touch.clientY - start.y;
          const clamped = start.expanded
            ? Math.min(Math.max(delta, 0), start.range)
            : Math.max(Math.min(delta, 0), -start.range);
          setDragY(clamped);
        }}
        onTouchEnd={(event) => {
          const start = dragStart.current;
          const end = event.changedTouches[0]?.clientY;
          dragStart.current = null;
          setDragging(false);
          setDragY(0);
          if (!start || end == null) return;
          const delta = end - start.y;
          if (Math.abs(delta) <= 8) return;
          suppressClick.current = true;
          if (Math.abs(delta) > 30) onExpandedChange(delta < 0);
        }}
        onTouchCancel={() => {
          dragStart.current = null;
          setDragging(false);
          setDragY(0);
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

          <div className={styles.list} data-testid="store-list">
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
