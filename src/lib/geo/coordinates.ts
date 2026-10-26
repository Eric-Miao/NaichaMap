export type GeoPoint = { lng: number; lat: number };

const PI = Math.PI;
const AXIS = 6_378_245;
const ECCENTRICITY = 0.006693421622965943;

export class InvalidLocationError extends Error {
  constructor(message = "Invalid geographic location") {
    super(message);
    this.name = "InvalidLocationError";
  }
}

export function validateGeoPoint(point: GeoPoint): GeoPoint {
  if (
    !Number.isFinite(point.lng) ||
    !Number.isFinite(point.lat) ||
    point.lng < -180 ||
    point.lng > 180 ||
    point.lat < -90 ||
    point.lat > 90
  ) {
    throw new InvalidLocationError();
  }
  return point;
}

export function assertShanghaiLocation(point: GeoPoint): GeoPoint {
  validateGeoPoint(point);
  if (point.lng < 120.8 || point.lng > 122.25 || point.lat < 30.65 || point.lat > 31.9) {
    throw new InvalidLocationError("Location is outside the Shanghai service area");
  }
  return point;
}

function outsideChina({ lng, lat }: GeoPoint) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(lng: number, lat: number) {
  let value = -100 + 2 * lng + 3 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  value += ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  value += ((20 * Math.sin(lat * PI) + 40 * Math.sin((lat / 3) * PI)) * 2) / 3;
  value += ((160 * Math.sin((lat / 12) * PI) + 320 * Math.sin((lat * PI) / 30)) * 2) / 3;
  return value;
}

function transformLng(lng: number, lat: number) {
  let value = 300 + lng + 2 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  value += ((20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2) / 3;
  value += ((20 * Math.sin(lng * PI) + 40 * Math.sin((lng / 3) * PI)) * 2) / 3;
  value += ((150 * Math.sin((lng / 12) * PI) + 300 * Math.sin((lng / 30) * PI)) * 2) / 3;
  return value;
}

export function wgs84ToGcj02(point: GeoPoint): GeoPoint {
  validateGeoPoint(point);
  if (outsideChina(point)) return { ...point };

  let deltaLat = transformLat(point.lng - 105, point.lat - 35);
  let deltaLng = transformLng(point.lng - 105, point.lat - 35);
  const radLat = (point.lat / 180) * PI;
  const magic = 1 - ECCENTRICITY * Math.sin(radLat) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  deltaLat = (deltaLat * 180) / (((AXIS * (1 - ECCENTRICITY)) / (magic * sqrtMagic)) * PI);
  deltaLng = (deltaLng * 180) / ((AXIS / sqrtMagic) * Math.cos(radLat) * PI);

  return { lng: point.lng + deltaLng, lat: point.lat + deltaLat };
}

export function gcj02ToWgs84(point: GeoPoint): GeoPoint {
  validateGeoPoint(point);
  if (outsideChina(point)) return { ...point };

  let estimate = { ...point };
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const converted = wgs84ToGcj02(estimate);
    estimate = {
      lng: estimate.lng + point.lng - converted.lng,
      lat: estimate.lat + point.lat - converted.lat,
    };
  }
  return estimate;
}
