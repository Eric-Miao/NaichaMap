import { describe, expect, it } from "vitest";

import {
  gcj02ToWgs84,
  InvalidLocationError,
  wgs84ToGcj02,
} from "../../src/lib/geo/coordinates";

const shanghaiWgs84 = { lng: 121.473701, lat: 31.230416 };
const shanghaiGcj02 = { lng: 121.478224, lat: 31.228474 };

function distanceMeters(a: typeof shanghaiWgs84, b: typeof shanghaiWgs84) {
  const latScale = 111_320;
  const lngScale = Math.cos((a.lat * Math.PI) / 180) * latScale;
  return Math.hypot((a.lng - b.lng) * lngScale, (a.lat - b.lat) * latScale);
}

describe("coordinate conversion", () => {
  it("converts a Shanghai WGS84 point to GCJ-02 within 15 meters", () => {
    expect(distanceMeters(wgs84ToGcj02(shanghaiWgs84), shanghaiGcj02)).toBeLessThan(15);
  });

  it("approximately converts the Shanghai GCJ-02 point back to WGS84", () => {
    expect(distanceMeters(gcj02ToWgs84(shanghaiGcj02), shanghaiWgs84)).toBeLessThan(15);
  });

  it("leaves points outside China unchanged", () => {
    const paris = { lng: 2.3522, lat: 48.8566 };
    expect(wgs84ToGcj02(paris)).toEqual(paris);
    expect(gcj02ToWgs84(paris)).toEqual(paris);
  });

  it.each([
    { lng: Number.NaN, lat: 31 },
    { lng: 181, lat: 31 },
    { lng: 121, lat: -91 },
  ])("rejects invalid coordinates: $lng,$lat", (point) => {
    expect(() => wgs84ToGcj02(point)).toThrow(InvalidLocationError);
  });
});
