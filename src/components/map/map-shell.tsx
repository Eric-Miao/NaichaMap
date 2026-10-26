"use client";

import type { StoreGroup } from "@/features/nearby/contracts";
import type { MapFilter } from "@/features/map/reducer";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { filterStoreGroups } from "@/features/map/selectors";

import { StoreDrawer } from "../stores/store-drawer";
import styles from "./map-ui.module.css";
import { StoreMap } from "./store-map";

export function MapShell({
  title,
  subtitle,
  styleUrl,
  userPoint,
  groups,
  filter,
  selectedId,
  drawerExpanded,
  onDrawerExpandedChange,
  onFilterChange,
  onSelectGroup,
  onSelectStore,
}: {
  title: string;
  subtitle: string;
  styleUrl?: string;
  userPoint: GeoPoint;
  groups: StoreGroup[];
  filter: MapFilter;
  selectedId: string | null;
  drawerExpanded: boolean;
  onDrawerExpandedChange: (expanded: boolean) => void;
  onFilterChange: (filter: MapFilter) => void;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  function selectGroup(id: string) {
    onSelectGroup(id);
    onDrawerExpandedChange(true);
    requestAnimationFrame(() => {
      document.getElementById(`group-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectStore(id: string) {
    onSelectStore(id);
    onDrawerExpandedChange(true);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      <StoreMap
        styleUrl={styleUrl}
        userPoint={userPoint}
        groups={filterStoreGroups(groups, filter)}
        selectedId={selectedId}
        onSelectGroup={selectGroup}
        onSelectStore={selectStore}
      />
      <StoreDrawer
        groups={groups}
        filter={filter}
        selectedId={selectedId}
        expanded={drawerExpanded}
        onExpandedChange={onDrawerExpandedChange}
        onFilterChange={onFilterChange}
        onSelectGroup={selectGroup}
        onSelectStore={selectStore}
      />
    </main>
  );
}
