import type { StoreGroup } from "@/features/nearby/contracts";
import { mapAnchors } from "@/features/map/map-anchors";
import type { DirectoryView } from "@/features/map/selectors";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { projectPoint, type MapView, type ViewportSize } from "@/lib/geo/viewport";

import styles from "./map-ui.module.css";

function rangeLabel(range: { start: string; end: string; count: number } | undefined) {
  if (!range) return "—";
  return range.count > 1 ? `${range.start}–${range.end}` : range.start;
}

export function MapMarkers({
  userPoint,
  groups,
  view,
  projection,
  size,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  userPoint: GeoPoint;
  groups: StoreGroup[];
  view: DirectoryView;
  projection: MapView | null;
  size: ViewportSize;
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  if (!projection) return null;
  // When the directory is fully expanded the map becomes a thin band; keep the
  // user locator and the selected marker, but skip the pile of other markers.
  const compact = size.height < 170;
  const anchors = mapAnchors(groups);
  const shownAnchors = compact
    ? anchors.filter((anchor) =>
        anchor.kind === "mall"
          ? anchor.group.id === selectedId ||
            anchor.group.stores.some((store) => store.id === selectedId)
          : anchor.store.id === selectedId,
      )
    : anchors;

  const position = (point: GeoPoint) => {
    const { x, y } = projectPoint(point, projection, size);
    return { left: `${x}px`, top: `${y}px` };
  };

  const selectedStoreGroup = groups.find((group) =>
    group.stores.some((store) => store.id === selectedId),
  )?.id;

  return (
    <div className={styles.markerLayer} role="group" aria-label="门店地图标记">
      <span className={styles.userMarker} style={position(userPoint)} aria-label="我的位置" />
      {shownAnchors.map((anchor) => {
        if (anchor.kind === "mall") {
          const range = view.rangeByGroupId[anchor.group.id];
          const selected =
            selectedId === anchor.group.id ||
            anchor.group.stores.some((store) => store.id === selectedId);
          return (
            <button
              key={anchor.group.id}
              type="button"
              className={`${styles.mallMarker} ${selected ? styles.selected : ""}`}
              style={position(anchor.point)}
              data-current={anchor.group.id === view.currentMallId || undefined}
              aria-label={`${anchor.group.mall.name}，${anchor.group.stores.length} 家门店`}
              onClick={() => onSelectGroup(anchor.group.id)}
            >
              <span className={styles.mallIndex}>{rangeLabel(range)}</span>
              <strong className={styles.mallName}>{anchor.group.mall.name}</strong>
              <span className={styles.mallCount}>{anchor.group.stores.length}</span>
            </button>
          );
        }

        const selected = selectedId === anchor.store.id || selectedStoreGroup === anchor.group.id;
        return (
          <button
            key={anchor.store.id}
            type="button"
            className={`${styles.marker} ${selected ? styles.selected : ""}`}
            style={position(anchor.point)}
            data-category={anchor.store.category}
            aria-label={anchor.store.name}
            onClick={() => onSelectStore(anchor.store.id)}
          >
            <span className={styles.markerIndex}>{view.indexByStoreId[anchor.store.id] ?? "—"}</span>
          </button>
        );
      })}
    </div>
  );
}
