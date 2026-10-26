import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({
  Map: class {
    remove = vi.fn();
  },
}));

import { StoreMap } from "../../src/components/map/store-map";

const groups = [
  {
    kind: "mall" as const,
    id: "mall-1",
    mall: { id: "mall-1", name: "上海国金中心", address: "世纪大道8号", distanceM: 80 },
    stores: [
      { id: "tea-1", name: "喜茶", branchName: null, category: "tea_drink" as const, address: "", mallId: "mall-1", location: { lng: 121.5, lat: 31.24 }, distanceM: 120 },
      { id: "coffee-1", name: "M Stand", branchName: null, category: "coffee" as const, address: "", mallId: "mall-1", location: { lng: 121.501, lat: 31.241 }, distanceM: 180 },
    ],
  },
  {
    kind: "street" as const,
    id: "street" as const,
    mall: null,
    stores: [
      { id: "drink-1", name: "鲜果饮品", branchName: null, category: "beverage" as const, address: "", mallId: null, location: { lng: 121.51, lat: 31.24 }, distanceM: 420 },
    ],
  },
];

describe("StoreMap", () => {
  it("renders semantic mall and street markers with two-way callbacks", async () => {
    const onSelectGroup = vi.fn();
    const onSelectStore = vi.fn();
    render(
      <StoreMap
        styleUrl="https://maps.example/style.json"
        userPoint={{ lng: 121.49, lat: 31.24 }}
        groups={groups}
        selectedId={null}
        onSelectGroup={onSelectGroup}
        onSelectStore={onSelectStore}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "上海国金中心，2 家门店" }));
    await userEvent.click(screen.getByRole("button", { name: "鲜果饮品" }));
    expect(onSelectGroup).toHaveBeenCalledWith("mall-1");
    expect(onSelectStore).toHaveBeenCalledWith("drink-1");
  });
});
