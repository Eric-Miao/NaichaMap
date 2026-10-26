import { describe, expect, it } from "vitest";

import { AmapProviderError } from "../../src/lib/amap/client";
import { normalizePoi } from "../../src/lib/amap/normalize";

describe("normalizePoi", () => {
  it("splits a canonical brand and trailing branch label", () => {
    const poi = normalizePoi(
      {
        id: "B001",
        name: "喜茶（上海环贸iapm店）",
        typecode: "050700",
        address: "淮海中路999号",
        location: "121.456,31.217",
      },
      [{ id: "brand-1", canonicalName: "喜茶", aliases: ["HEYTEA"] }],
    );

    expect(poi).toMatchObject({
      providerPlaceId: "B001",
      canonicalName: "喜茶",
      branchName: "上海环贸iapm店",
      brandId: "brand-1",
      category: "tea_drink",
    });
  });

  it("uses the clean name when a brand is unknown", () => {
    expect(
      normalizePoi({
        id: "B002",
        name: "巷口果茶",
        typecode: "050700",
        address: [],
        location: "121.47,31.23",
      }).canonicalName,
    ).toBe("巷口果茶");
  });

  it("rejects malformed provider coordinates", () => {
    expect(() =>
      normalizePoi({
        id: "bad",
        name: "喜茶",
        typecode: "050700",
        address: "",
        location: "not-a-point",
      }),
    ).toThrowError(AmapProviderError);
  });
});
