import { describe, expect, it } from "vitest";

import { classifyPoi } from "../../src/lib/amap/classify";

describe("classifyPoi", () => {
  it.each([
    ["050700", "喜茶(环贸店)", "tea_drink"],
    ["050500", "Manner Coffee", "coffee"],
    ["000000", "阿嬷手作茶饮", "tea_drink"],
    ["000000", "鲜榨果汁饮品店", "beverage"],
  ] as const)("classifies %s %s", (typecode, name, expected) => {
    expect(classifyPoi({ typecode, name })).toBe(expected);
  });

  it.each([
    ["050100", "喜茶餐厅"],
    ["060200", "罗森便利店咖啡"],
    ["060400", "盒马超市茶饮"],
    ["000000", "上海书店"],
  ])("excludes non-drink POIs", (typecode, name) => {
    expect(classifyPoi({ typecode, name })).toBeNull();
  });
});
