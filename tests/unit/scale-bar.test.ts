import { describe, expect, it } from "vitest";

import { scaleBar } from "../../src/lib/geo/viewport";

describe("scaleBar", () => {
  it("returns a rounded distance and a drawable width", () => {
    const scale = scaleBar({ center: { lng: 121.5, lat: 31.24 }, zoom: 15.5 });
    expect(scale.label).toMatch(/^\d+ M$/);
    expect(scale.width).toBeGreaterThan(40);
    expect(scale.width).toBeLessThan(110);
  });

  it("switches to kilometres when zoomed out", () => {
    const scale = scaleBar({ center: { lng: 121.5, lat: 31.24 }, zoom: 11 });
    expect(scale.label).toMatch(/^\d+ KM$/);
  });
});
