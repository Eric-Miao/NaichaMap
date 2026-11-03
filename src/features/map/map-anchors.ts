import type { StoreGroup, StoreSummary } from "@/features/nearby/contracts";
import type { GeoPoint } from "@/lib/geo/coordinates";

export type MapAnchor =
  | { kind: "mall"; group: Extract<StoreGroup, { kind: "mall" }>; point: GeoPoint }
  | { kind: "store"; group: Extract<StoreGroup, { kind: "street" }>; store: StoreSummary; point: GeoPoint };

export function averagePoint(points: GeoPoint[]): GeoPoint {
  return {
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  };
}

/**
 * One anchor per visible mall section (centroid of its member stores) and one
 * per street store. Mall member stores are not drawn individually so a 30-store
 * building does not become a pile of overlapping pins.
 */
export function mapAnchors(groups: StoreGroup[]): MapAnchor[] {
  return groups.flatMap((group): MapAnchor[] => {
    if (group.kind === "mall") {
      if (group.stores.length === 0) return [];
      return [{ kind: "mall", group, point: averagePoint(group.stores.map((store) => store.location)) }];
    }
    return group.stores.map((store) => ({ kind: "store", group, store, point: store.location }));
  });
}
