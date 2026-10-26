import type { BrandAlias, NormalizedPlace, NormalizedPoi } from "@/lib/domain/store";
import { gcj02ToWgs84, validateGeoPoint, type GeoPoint } from "@/lib/geo/coordinates";

import { classifyPoi } from "./classify";
import { AmapProviderError, type AmapPoi } from "./types";

function parseLocation(location: string): GeoPoint {
  const [lngText, latText, ...rest] = location.split(",");
  const lng = Number(lngText);
  const lat = Number(latText);
  if (rest.length > 0 || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned an invalid coordinate");
  }
  try {
    return validateGeoPoint({ lng, lat });
  } catch {
    throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned an invalid coordinate");
  }
}

function normalizeAddress(address: AmapPoi["address"]) {
  return Array.isArray(address) ? (address[0] ?? "") : (address ?? "");
}

export function normalizePlace(poi: AmapPoi): NormalizedPlace {
  if (!poi.id || !poi.name) {
    throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned an incomplete place");
  }
  const gcj02 = parseLocation(poi.location);
  return {
    provider: "amap",
    providerPlaceId: poi.id,
    name: poi.name.trim(),
    address: normalizeAddress(poi.address),
    gcj02,
    wgs84: gcj02ToWgs84(gcj02),
    providerParentId: poi.parent || null,
  };
}

export function normalizePoi(poi: AmapPoi, brands: BrandAlias[] = []): NormalizedPoi {
  const category = classifyPoi(poi);
  if (!category) {
    throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned a non-beverage POI");
  }

  const normalized = normalizePlace(poi);
  const match = normalized.name.match(/^(.*?)\s*[（(]([^（）()]*)[）)]\s*$/);
  const cleanName = (match?.[1] ?? normalized.name).trim();
  const branchName = match?.[2]?.trim() || null;
  const brand = brands.find(
    (candidate) =>
      candidate.canonicalName.toLocaleLowerCase() === cleanName.toLocaleLowerCase() ||
      candidate.aliases.some((alias) => alias.toLocaleLowerCase() === cleanName.toLocaleLowerCase()),
  );

  return {
    ...normalized,
    canonicalName: brand?.canonicalName ?? cleanName,
    branchName,
    brandId: brand?.id ?? null,
    category,
  };
}
