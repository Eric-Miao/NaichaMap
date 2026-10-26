import { validateGeoPoint, type GeoPoint } from "./coordinates";

const CELL_SIZE = 0.005;

export type SearchCell = {
  id: string;
  center: GeoPoint;
  fetchRadiusM: 1500;
};

export function getSearchCell(point: GeoPoint): SearchCell {
  validateGeoPoint(point);
  const lngIndex = Math.floor(point.lng / CELL_SIZE);
  const latIndex = Math.floor(point.lat / CELL_SIZE);

  return {
    id: `${lngIndex}:${latIndex}`,
    center: {
      lng: Number(((lngIndex + 0.5) * CELL_SIZE).toFixed(6)),
      lat: Number(((latIndex + 0.5) * CELL_SIZE).toFixed(6)),
    },
    fetchRadiusM: 1500,
  };
}
