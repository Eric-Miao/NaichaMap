import type { GeoPoint } from "@/lib/geo/coordinates";

export type MallCandidate = {
  id: string;
  providerPlaceId: string;
  name: string;
  address: string;
  location: GeoPoint;
  boundary: GeoPoint[] | null;
};

export type StoreMallEvidence = {
  providerParentId: string | null;
  name: string;
  address: string;
  location: GeoPoint;
};

function containsPoint(point: GeoPoint, polygon: GeoPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.lat > point.lat !== previousPoint.lat > point.lat &&
      point.lng <
        ((previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)) /
          (previousPoint.lat - currentPoint.lat) +
          currentPoint.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceMeters(first: GeoPoint, second: GeoPoint) {
  const earthRadius = 6_371_000;
  const lat1 = (first.lat * Math.PI) / 180;
  const lat2 = (second.lat * Math.PI) / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = ((second.lng - first.lng) * Math.PI) / 180;
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

function normalizeMallName(name: string) {
  return name
    .toLocaleLowerCase()
    .replace(/上海|购物中心|购物广场|商场|广场/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function resolveCurrentMall(point: GeoPoint, malls: MallCandidate[]) {
  return malls.find((mall) => mall.boundary && containsPoint(point, mall.boundary)) ?? null;
}

export function resolveMallForStore(store: StoreMallEvidence, malls: MallCandidate[]) {
  const boundaryMatch = malls.find(
    (mall) => mall.boundary && containsPoint(store.location, mall.boundary),
  );
  if (boundaryMatch) return boundaryMatch;

  const storeText = normalizeMallName(`${store.name}${store.address}`);
  return (
    malls.find((mall) => {
      const mallName = normalizeMallName(mall.name);
      return (
        Boolean(store.providerParentId) &&
        store.providerParentId === mall.providerPlaceId &&
        distanceMeters(store.location, mall.location) <= 300 &&
        mallName.length >= 2 &&
        storeText.includes(mallName)
      );
    }) ?? null
  );
}
