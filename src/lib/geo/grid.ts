import { validateGeoPoint, type GeoPoint } from "./coordinates";
import { AMAP_FETCH_RADIUS_M } from "./search";

const CELL_SIZE = 0.005;

export type SearchCell = {
  id: string;
  center: GeoPoint;
  fetchRadiusM: number;
};

export function getSearchCell(point: GeoPoint): SearchCell {
  validateGeoPoint(point);
  const lngIndex = Math.floor(point.lng / CELL_SIZE);
  const latIndex = Math.floor(point.lat / CELL_SIZE);

  return {
    id: `v4:${lngIndex}:${latIndex}`,
    center: {
      lng: Number(((lngIndex + 0.5) * CELL_SIZE).toFixed(6)),
      lat: Number(((latIndex + 0.5) * CELL_SIZE).toFixed(6)),
    },
    fetchRadiusM: AMAP_FETCH_RADIUS_M,
  };
}
