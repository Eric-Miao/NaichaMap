"use client";

import { useMemo } from "react";

import type { StoreGroup } from "@/features/nearby/contracts";
import type { GroupFilter, MapFilter } from "@/features/map/reducer";
import { buildDirectoryView } from "@/features/map/selectors";
import type { GeoPoint } from "@/lib/geo/coordinates";

import { StoreDrawer } from "../stores/store-drawer";
import styles from "./map-ui.module.css";
import { StoreMap } from "./store-map";

export function MapShell({
  title,
  subtitle,
  stale,
  styleUrl,
  userPoint,
  groups,
  currentMallId,
  filter,
  groupFilter,
  selectedId,
  drawerExpanded,
  onOpenCorrections,
  onDrawerExpandedChange,
  onFilterChange,
  onGroupFilterChange,
  onSelectGroup,
  onSelectStore,
}: {
  title: string;
  subtitle: string;
  stale: string | null;
  styleUrl?: string;
  userPoint: GeoPoint;
  groups: StoreGroup[];
  currentMallId: string | null;
  filter: MapFilter;
  groupFilter: GroupFilter;
  selectedId: string | null;
  drawerExpanded: boolean;
  onOpenCorrections: () => void;
  onDrawerExpandedChange: (expanded: boolean) => void;
  onFilterChange: (filter: MapFilter) => void;
  onGroupFilterChange: (filter: GroupFilter) => void;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const view = useMemo(
    () => buildDirectoryView(groups, filter, groupFilter, currentMallId),
    [currentMallId, filter, groupFilter, groups],
  );

  function selectGroup(id: string) {
    onSelectGroup(id);
    onDrawerExpandedChange(true);
    requestAnimationFrame(() => {
      document.getElementById(`group-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectStore(id: string) {
    onSelectStore(id);
    // Collapse first so the selected pin is not hidden under an expanded sheet.
    onDrawerExpandedChange(false);
    requestAnimationFrame(() => {
      document.getElementById(`store-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.headerEyebrow}>
            <span>NAICHAMAP</span>
            <span className={styles.headerRule} aria-hidden="true" />
            <span>SHANGHAI</span>
          </p>
          <h1 className={styles.headerTitle} title={title}>{title}</h1>
          <p className={styles.headerMeta}>{subtitle}</p>
        </div>
        <button type="button" className={styles.feedback} onClick={onOpenCorrections}>
          信息有误？
        </button>
        {stale ? (
          <p className={styles.stale} role="status">
            {stale}
          </p>
        ) : null}
      </header>

      <StoreMap
        key={styleUrl ?? "default"}
        styleUrl={styleUrl}
        userPoint={userPoint}
        groups={view.groups}
        view={view}
        selectedId={selectedId}
        onSelectGroup={selectGroup}
        onSelectStore={selectStore}
      />
      <StoreDrawer
        view={view}
        filter={filter}
        groupFilter={groupFilter}
        selectedId={selectedId}
        expanded={drawerExpanded}
        onExpandedChange={onDrawerExpandedChange}
        onFilterChange={onFilterChange}
        onGroupFilterChange={onGroupFilterChange}
        onSelectGroup={selectGroup}
        onSelectStore={selectStore}
        onCorrection={onOpenCorrections}
      />
    </main>
  );
}
