import type { StoreGroup } from "@/features/nearby/contracts";
import { mapAnchors } from "@/features/map/map-anchors";
import type { DirectoryView } from "@/features/map/selectors";
import type { GeoPoint } from "@/lib/geo/coordinates";
import { projectPoint, type MapView, type ViewportSize } from "@/lib/geo/viewport";

import styles from "./map-ui.module.css";

const PIN_PATH = "M20 51C20 51 38 31 38 19A18 18 0 1 0 2 19C2 31 20 51 20 51Z";

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

  const compact = size.height < 170;
  const anchors = mapAnchors(groups);
  const selectedStore =
    groups.flatMap((group) => group.stores).find((store) => store.id === selectedId) ?? null;
  const selectedStoreInMall = Boolean(selectedStore?.mallId);

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

  return (
    <div className={styles.markerLayer} role="group" aria-label="门店地图标记">
      <span className={styles.userMarker} style={position(userPoint)} aria-label="我的位置" />

      {shownAnchors.map((anchor) => {
        if (anchor.kind === "mall") {
          const selected =
            selectedId === anchor.group.id ||
            anchor.group.stores.some((store) => store.id === selectedId);
          return (
            <button
              key={anchor.group.id}
              type="button"
              className={[
                styles.pin,
                styles.mallPin,
                selected ? styles.selected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={position(anchor.point)}
              data-current={anchor.group.id === view.currentMallId || undefined}
              data-selected={selected || undefined}
              aria-label={`${anchor.group.mall.name}，${anchor.group.stores.length} 家门店`}
              aria-pressed={selected}
              onClick={() => onSelectGroup(anchor.group.id)}
            >
              <svg className={styles.pinShape} viewBox="0 0 40 52" aria-hidden="true">
                <path d={PIN_PATH} />
              </svg>
              <span className={styles.pinIndex}>{anchor.group.stores.length}</span>
            </button>
          );
        }

        return (
          <button
            key={anchor.store.id}
            type="button"
            className={[styles.pin, selectedId === anchor.store.id ? styles.selected : ""]
              .filter(Boolean)
              .join(" ")}
            style={position(anchor.point)}
            data-category={anchor.store.category}
            data-selected={selectedId === anchor.store.id || undefined}
            aria-label={anchor.store.name}
            aria-pressed={selectedId === anchor.store.id}
            onClick={() => onSelectStore(anchor.store.id)}
          >
            <svg className={styles.pinShape} viewBox="0 0 40 52" aria-hidden="true">
              <path d={PIN_PATH} />
            </svg>
            <span className={styles.pinIndex}>
              {view.indexByStoreId[anchor.store.id] ?? "—"}
            </span>
          </button>
        );
      })}

      {selectedStore && selectedStoreInMall ? (
        <button
          type="button"
          className={`${styles.pin} ${styles.selected} ${styles.storePinSelected}`}
          style={position(selectedStore.location)}
          data-category={selectedStore.category}
          data-selected="true"
          aria-label={selectedStore.name}
          aria-pressed="true"
          onClick={() => onSelectStore(selectedStore.id)}
        >
          <svg className={styles.pinShape} viewBox="0 0 40 52" aria-hidden="true">
            <path d={PIN_PATH} />
          </svg>
          <span className={styles.pinIndex}>
            {view.indexByStoreId[selectedStore.id] ?? "—"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
