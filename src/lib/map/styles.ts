/**
 * Basemap policy.
 *
 * OSM-based vector styles are the default: they are WGS84 (matching stored
 * store coordinates), need no key, and have a second independent provider for
 * the fallback. A deployment may override the primary style with
 * NEXT_PUBLIC_MAP_STYLE_URL (for example a self-hosted or MapCN style).
 */
export const DEFAULT_MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const FALLBACK_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export type MapStyleProvider = "carto" | "openfreemap" | "custom";

export function mapStyleProvider(styleUrl: string): MapStyleProvider {
  if (styleUrl.includes("cartocdn.com")) return "carto";
  if (styleUrl.includes("openfreemap.org")) return "openfreemap";
  return "custom";
}

export function basemapLabel(provider: MapStyleProvider): string {
  if (provider === "carto") return "底图 © OpenStreetMap · CARTO";
  if (provider === "openfreemap") return "底图 © OpenStreetMap";
  return "底图 © 样式提供方";
}
