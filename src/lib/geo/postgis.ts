import { validateGeoPoint, type GeoPoint } from "./coordinates";

function validPoint(lng: number, lat: number): GeoPoint | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  try {
    return validateGeoPoint({ lng, lat });
  } catch {
    return null;
  }
}

function parseEwkb(value: unknown) {
  if (typeof value !== "string" || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
    return null;
  }
  const bytes = Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
  if (bytes.length < 9 || (bytes[0] !== 0 && bytes[0] !== 1)) return null;
  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const type = view.getUint32(1, littleEndian);
  return {
    bytes,
    view,
    littleEndian,
    type,
    dataOffset: 5 + ((type & 0x20000000) === 0 ? 0 : 4),
    coordinateStride: 16 + ((type & 0x80000000) === 0 ? 0 : 8) + ((type & 0x40000000) === 0 ? 0 : 8),
  };
}

export function parsePostgisPoint(value: unknown): GeoPoint | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      return validPoint(Number(coordinates[0]), Number(coordinates[1]));
    }
    return null;
  }

  const geometry = parseEwkb(value);
  if (!geometry || (geometry.type & 0x0fffffff) !== 1) return null;
  const { bytes, view, littleEndian, dataOffset } = geometry;
  if (bytes.length < dataOffset + 16) return null;

  return validPoint(
    view.getFloat64(dataOffset, littleEndian),
    view.getFloat64(dataOffset + 8, littleEndian),
  );
}

export function parsePostgisPolygon(value: unknown): GeoPoint[] | null {
  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    const ring = Array.isArray(coordinates) ? coordinates[0] : null;
    if (!Array.isArray(ring)) return null;
    const points = ring.map((coordinate) =>
      Array.isArray(coordinate) ? validPoint(Number(coordinate[0]), Number(coordinate[1])) : null,
    );
    return points.length >= 3 && points.every((point): point is GeoPoint => point !== null)
      ? points
      : null;
  }

  const geometry = parseEwkb(value);
  if (!geometry || (geometry.type & 0x0fffffff) !== 3) return null;
  const { bytes, view, littleEndian, dataOffset, coordinateStride } = geometry;
  if (bytes.length < dataOffset + 8 || view.getUint32(dataOffset, littleEndian) < 1) return null;

  const pointCount = view.getUint32(dataOffset + 4, littleEndian);
  const pointsOffset = dataOffset + 8;
  if (pointCount < 3 || bytes.length < pointsOffset + pointCount * coordinateStride) return null;

  const points: GeoPoint[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const offset = pointsOffset + index * coordinateStride;
    const point = validPoint(
      view.getFloat64(offset, littleEndian),
      view.getFloat64(offset + 8, littleEndian),
    );
    if (!point) return null;
    points.push(point);
  }
  return points;
}
