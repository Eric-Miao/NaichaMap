import type { StoreGroup } from "@/features/nearby/contracts";
import type { GeoPoint } from "@/lib/geo/coordinates";

import styles from "./map-ui.module.css";

function average(points: GeoPoint[]) {
  return {
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  };
}

export function MapMarkers({
  userPoint,
  groups,
  selectedId,
  onSelectGroup,
  onSelectStore,
}: {
  userPoint: GeoPoint;
  groups: StoreGroup[];
  selectedId: string | null;
  onSelectGroup: (id: string) => void;
  onSelectStore: (id: string) => void;
}) {
  const mallMarkers = groups
    .filter(
      (group): group is Extract<StoreGroup, { kind: "mall" }> =>
        group.kind === "mall" && group.stores.length > 0,
    )
    .map((group) => ({ group, point: average(group.stores.map((store) => store.location)) }));
  const streetStores = groups.filter((group) => group.kind === "street").flatMap((group) => group.stores);
  const points = [userPoint, ...mallMarkers.map((marker) => marker.point), ...streetStores.map((store) => store.location)];
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const position = (point: GeoPoint) => ({
    left: `${12 + ((point.lng - minLng) / Math.max(maxLng - minLng, 0.001)) * 76}%`,
    top: `${12 + (1 - (point.lat - minLat) / Math.max(maxLat - minLat, 0.001)) * 66}%`,
  });

  return (
    <div className={styles.markerLayer} aria-label="门店地图标记">
      <span className={styles.userMarker} style={position(userPoint)} aria-label="我的位置" />
      {mallMarkers.map(({ group, point }) => (
        <button
          key={group.id}
          type="button"
          className={`${styles.mallMarker} ${selectedId === group.id ? styles.selected : ""}`}
          style={position(point)}
          aria-label={`${group.mall.name}，${group.stores.length} 家门店`}
          onClick={() => onSelectGroup(group.id)}
        >
          <strong>{group.mall.name}</strong>
          <span>{group.stores.length}</span>
        </button>
      ))}
      {streetStores.map((store) => (
        <button
          key={store.id}
          type="button"
          className={`${styles.marker} ${selectedId === store.id ? styles.selected : ""}`}
          data-category={store.category}
          style={position(store.location)}
          aria-label={store.name}
          onClick={() => onSelectStore(store.id)}
        >
          <span>{store.category === "coffee" ? "咖" : store.category === "beverage" ? "饮" : "茶"}</span>
        </button>
      ))}
    </div>
  );
}
