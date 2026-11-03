import type { GeoPoint } from "./coordinates";

export type ViewportSize = { width: number; height: number };
export type MapView = { center: GeoPoint; zoom: number };
export type ScreenPoint = { x: number; y: number };

// MapLibre/Mapbox-style zoom is defined over 512px tiles, not slippy 256px tiles.
const TILE_SIZE = 512;
const MAX_LATITUDE = 85.05112878;

type WorldPoint = { x: number; y: number };

function toWorld({ lng, lat }: GeoPoint): WorldPoint {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const radians = (clamped * Math.PI) / 180;
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + Math.sin(radians)) / (1 - Math.sin(radians))) / (4 * Math.PI),
  };
}

function fromWorld({ x, y }: WorldPoint): GeoPoint {
  const lng = x * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
  return { lng, lat };
}

export type FitOptions = {
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
};

/**
 * Choose the map centre and zoom that make every point visible inside the
 * viewport with the given padding. Returns null while the viewport is unmeasured.
 */
export function fitMapView(
  points: GeoPoint[],
  size: ViewportSize,
  { padding = 32, minZoom = 13, maxZoom = 17 }: FitOptions = {},
): MapView | null {
  if (points.length === 0 || size.width <= 0 || size.height <= 0) return null;

  const worlds = points.map(toWorld);
  const minX = Math.min(...worlds.map((point) => point.x));
  const maxX = Math.max(...worlds.map((point) => point.x));
  const minY = Math.min(...worlds.map((point) => point.y));
  const maxY = Math.max(...worlds.map((point) => point.y));
  const center = fromWorld({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });

  const availableWidth = Math.max(size.width - padding * 2, 1);
  const availableHeight = Math.max(size.height - padding * 2, 1);
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const zoomForAxis = (span: number, available: number) => {
    if (span <= 1e-12) return maxZoom;
    return Math.log2(available / (span * TILE_SIZE));
  };

  const zoom = Math.max(
    minZoom,
    Math.min(maxZoom, Math.min(zoomForAxis(spanX, availableWidth), zoomForAxis(spanY, availableHeight))),
  );

  return { center, zoom };
}

/** Project a geo point into CSS pixels inside the viewport described by `view`. */
export function projectPoint(point: GeoPoint, view: MapView, size: ViewportSize): ScreenPoint {
  const scale = TILE_SIZE * 2 ** view.zoom;
  const world = toWorld(point);
  const center = toWorld(view.center);
  return {
    x: (world.x - center.x) * scale + size.width / 2,
    y: (world.y - center.y) * scale + size.height / 2,
  };
}

/** Approximate metres per CSS pixel at a latitude and zoom, for labels and sizing. */
export function metresPerPixel(latitude: number, zoom: number) {
  const worldMetres = 40_075_016.686;
  return (worldMetres * Math.cos((latitude * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom);
}

/** A rounded scale-bar distance and the CSS width that represents it. */
export function scaleBar(view: MapView, targetPx = 64) {
  const metresPerCssPixel = metresPerPixel(view.center.lat, view.zoom);
  const raw = Math.max(metresPerCssPixel * targetPx, 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;
  const step = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  const distance = step * power;
  return {
    distance,
    width: distance / metresPerCssPixel,
    label: distance >= 1000 ? `${distance / 1000} KM` : `${Math.round(distance)} M`,
  };
}
