import { describe, expect, it } from "vitest";

import { getSearchCell } from "../../src/lib/geo/grid";

describe("getSearchCell", () => {
  it("puts nearby points into one 0.005° cell", () => {
    const first = getSearchCell({ lng: 121.4711, lat: 31.2311 });
    const second = getSearchCell({ lng: 121.4749, lat: 31.2349 });

    expect(second.id).toBe(first.id);
    expect(first.fetchRadiusM).toBe(1500);
  });

  it("returns a stable center that resolves to the same cell", () => {
    const cell = getSearchCell({ lng: 121.4737, lat: 31.2304 });
    expect(getSearchCell(cell.center)).toEqual(cell);
  });
});
