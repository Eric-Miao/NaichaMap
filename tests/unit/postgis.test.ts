import { describe, expect, it } from "vitest";

import { parsePostgisPoint, parsePostgisPolygon } from "../../src/lib/geo/postgis";

describe("parsePostgisPoint", () => {
  it("parses the EWKB hex format returned by Supabase", () => {
    expect(parsePostgisPoint(
      "0101000020E6100000079EEF5BDC5F5E405DD24C5EB83B3F40",
    )).toEqual({
      lng: expect.closeTo(121.4978246536267, 10),
      lat: expect.closeTo(31.233281987910562, 10),
    });
  });

  it("keeps GeoJSON points compatible", () => {
    expect(parsePostgisPoint({ type: "Point", coordinates: [121.5, 31.2] }))
      .toEqual({ lng: 121.5, lat: 31.2 });
  });

  it("rejects malformed geometry", () => {
    expect(parsePostgisPoint("not-ewkb")).toBeNull();
  });

  it("parses EWKB polygon boundaries returned by Supabase", () => {
    const polygon = parsePostgisPolygon(
      "0103000020E610000001000000050000008FC2F5285C5F5E407B14AE47E13A3F400000000000605E407B14AE47E13A3F400000000000605E403D0AD7A3703D3F408FC2F5285C5F5E403D0AD7A3703D3F408FC2F5285C5F5E407B14AE47E13A3F40",
    );

    expect(polygon).toHaveLength(5);
    expect(polygon?.[0]).toEqual({
      lng: expect.closeTo(121.49, 10),
      lat: expect.closeTo(31.23, 10),
    });
  });
});
