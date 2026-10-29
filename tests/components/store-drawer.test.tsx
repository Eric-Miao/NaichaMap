import { useState } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StoreDrawer } from "../../src/components/stores/store-drawer";
import type { StoreGroup } from "../../src/features/nearby/contracts";
import type { MapFilter } from "../../src/features/map/reducer";

const groups: StoreGroup[] = [
  {
    kind: "mall",
    id: "mall-1",
    mall: { id: "mall-1", name: "上海国金中心", address: "世纪大道8号", distanceM: 80 },
    stores: [
      { id: "tea-1", name: "喜茶", branchName: "国金中心店", category: "tea_drink", address: "世纪大道8号", mallId: "mall-1", location: { lng: 121.5, lat: 31.24 }, distanceM: 120 },
      { id: "coffee-1", name: "M Stand", branchName: null, category: "coffee", address: "世纪大道8号", mallId: "mall-1", location: { lng: 121.501, lat: 31.241 }, distanceM: 180 },
    ],
  },
  {
    kind: "street",
    id: "street",
    mall: null,
    stores: [
      { id: "drink-1", name: "鲜果饮品", branchName: null, category: "beverage", address: "陆家嘴环路", mallId: null, location: { lng: 121.51, lat: 31.24 }, distanceM: 420 },
    ],
  },
];

function DrawerHarness(props: { onSelectGroup?: (id: string) => void; onSelectStore?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [groupFilter, setGroupFilter] = useState("all");
  return (
    <StoreDrawer
      groups={groups}
      filter={filter}
      groupFilter={groupFilter}
      selectedId={null}
      expanded={expanded}
      onExpandedChange={setExpanded}
      onFilterChange={setFilter}
      onGroupFilterChange={setGroupFilter}
      onSelectGroup={props.onSelectGroup ?? vi.fn()}
      onSelectStore={props.onSelectStore ?? vi.fn()}
    />
  );
}

describe("StoreDrawer", () => {
  it("expands upward and shows sticky category counts", async () => {
    render(<DrawerHarness />);
    const drawer = screen.getByTestId("store-drawer");
    expect(drawer).toHaveAttribute("data-state", "collapsed");
    expect(screen.getByRole("tab", { name: "全部 3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "茶饮 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "咖啡 1" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "展开门店列表" }));
    expect(drawer).toHaveAttribute("data-state", "expanded");
  });

  it("filters categories without losing mall and street headings", async () => {
    render(<DrawerHarness />);
    await userEvent.click(screen.getByRole("tab", { name: "茶饮 2" }));
    expect(screen.getByText("上海国金中心")).toBeInTheDocument();
    expect(screen.getByText("周边街铺")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择喜茶" })).toBeInTheDocument();
    expect(screen.getByText("鲜果饮品")).toBeInTheDocument();
    expect(screen.queryByText("M Stand")).not.toBeInTheDocument();
  });

  it("lists only non-empty nearby locations and filters the drawer by mall", async () => {
    render(<DrawerHarness />);
    expect(screen.getByRole("tab", { name: "全部地点 3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "上海国金中心 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "周边街铺 1" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "上海国金中心 2" }));
    expect(screen.getByRole("button", { name: "选择喜茶" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择M Stand" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "选择鲜果饮品" })).not.toBeInTheDocument();
  });

  it("forwards group and store selection", async () => {
    const onSelectGroup = vi.fn();
    const onSelectStore = vi.fn();
    render(<DrawerHarness onSelectGroup={onSelectGroup} onSelectStore={onSelectStore} />);

    await userEvent.click(screen.getByRole("button", { name: "查看上海国金中心门店" }));
    await userEvent.click(screen.getByRole("button", { name: "选择喜茶" }));
    expect(onSelectGroup).toHaveBeenCalledWith("mall-1");
    expect(onSelectStore).toHaveBeenCalledWith("tea-1");
  });
});
