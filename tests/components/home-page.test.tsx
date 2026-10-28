import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({
  Map: class {
    remove = vi.fn();
  },
}));

import HomePage from "../../src/app/page";

const nearby = {
  currentMall: { id: "mall-1", name: "上海国金中心", address: "世纪大道8号", distanceM: 80 },
  groups: [
    {
      kind: "mall",
      id: "mall-1",
      mall: { id: "mall-1", name: "上海国金中心", address: "世纪大道8号", distanceM: 80 },
      stores: [
        { id: "tea-1", name: "喜茶", branchName: null, category: "tea_drink", address: "世纪大道8号", mallId: "mall-1", location: { lng: 121.5, lat: 31.24 }, distanceM: 120 },
      ],
    },
  ],
  cacheStatus: "fresh",
};

let locationSuccess: PositionCallback;
let locationError: PositionErrorCallback;

function setFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)));
}

beforeEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
        locationSuccess = success;
        locationError = error;
      }),
    },
  });
  setFetch(() => Response.json(nearby));
});

describe("HomePage", () => {
  it("keeps entry action labels independent from decorative icon slots", () => {
    render(<HomePage />);

    for (const name of ["使用我的位置", "搜索商场或地点"]) {
      const button = screen.getByRole("button", { name });
      const slots = button.querySelectorAll(":scope > span");
      expect(slots).toHaveLength(3);
      expect(slots[0]).toHaveAttribute("aria-hidden", "true");
      expect(slots[2]).toHaveAttribute("aria-hidden", "true");
      expect(slots[1]).toHaveTextContent(name);
    }
  });

  it("requests location only after a clear user action and renders mall mode", async () => {
    render(<HomePage />);
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);

    expect(await screen.findByRole("heading", { name: "上海国金中心" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上海国金中心，1 家门店" })).toBeInTheDocument();
  });

  it("exposes store categories consistently to cards and map markers", async () => {
    setFetch(() => Response.json({
      ...nearby,
      currentMall: null,
      groups: [{
        kind: "street",
        id: "street",
        mall: null,
        stores: [
          nearby.groups[0].stores[0],
          { ...nearby.groups[0].stores[0], id: "coffee-1", name: "M Stand", category: "coffee" },
        ],
      }],
    }));
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);

    const teaCard = await screen.findByRole("article", { name: "喜茶门店信息" });
    const coffeeCard = screen.getByRole("article", { name: "M Stand门店信息" });
    expect(teaCard).toHaveAttribute("data-category", "tea_drink");
    expect(coffeeCard).toHaveAttribute("data-category", "coffee");
    expect(screen.getByRole("button", { name: "喜茶" })).toHaveAttribute("data-category", "tea_drink");
    expect(screen.getByRole("button", { name: "M Stand" })).toHaveAttribute("data-category", "coffee");
  });

  it("falls back to manual Shanghai place search after permission denial", async () => {
    setFetch((url) =>
      url.startsWith("/api/search-place")
        ? Response.json({ results: [{ label: "环贸iapm", address: "淮海中路999号", location: { lng: 121.456, lat: 31.217 } }] })
        : Response.json({ ...nearby, currentMall: null }),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationError({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);

    const input = await screen.findByRole("searchbox", { name: "搜索上海商场或地点" });
    await userEvent.type(input, "环贸");
    await userEvent.click(screen.getByRole("button", { name: "搜索" }));
    await userEvent.click(await screen.findByRole("button", { name: /环贸iapm/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/nearby", expect.anything()));
  });

  it("keeps stale data interactive and displays its timestamp", async () => {
    setFetch(() =>
      Response.json({ ...nearby, cacheStatus: "stale", cachedAt: "2026-10-25T10:00:00.000Z" }),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);

    expect(await screen.findByText(/显示的是较早数据/)).toHaveTextContent("2026");
    expect(screen.getByRole("button", { name: "选择喜茶" })).toBeEnabled();
  });

  it("offers a new location attempt after a recoverable provider failure", async () => {
    setFetch(() =>
      Response.json(
        { error: { code: "PROVIDER_UNAVAILABLE", message: "暂时无法刷新", retryable: true } },
        { status: 503 },
      ),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);

    await userEvent.click(await screen.findByRole("button", { name: "重试" }));
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("opens omission correction from an empty result and reports success", async () => {
    setFetch((url) =>
      url === "/api/corrections"
        ? Response.json({ ok: true }, { status: 201 })
        : Response.json({ currentMall: null, groups: [], cacheStatus: "fresh" }),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);

    await userEvent.click(await screen.findByRole("button", { name: "补充遗漏门店" }));
    await userEvent.type(screen.getByLabelText("门店名称"), "测试茶饮店");
    await userEvent.type(screen.getByLabelText("补充说明"), "这里新开了一家店");
    await userEvent.click(screen.getByRole("button", { name: "提交纠错" }));
    expect(await screen.findByText("感谢，你的反馈已记录")).toBeInTheDocument();
  });

  it("shows correction throttling without hiding the form", async () => {
    setFetch((url) =>
      url === "/api/corrections"
        ? Response.json(
            { error: { code: "RATE_LIMITED", message: "每五分钟只能提交一次", retryable: true }, retryAfterSeconds: 180 },
            { status: 429 },
          )
        : Response.json({ currentMall: null, groups: [], cacheStatus: "fresh" }),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);
    await userEvent.click(await screen.findByRole("button", { name: "补充遗漏门店" }));
    await userEvent.type(screen.getByLabelText("门店名称"), "测试茶饮店");
    await userEvent.type(screen.getByLabelText("补充说明"), "这里新开了一家店");
    await userEvent.click(screen.getByRole("button", { name: "提交纠错" }));

    expect(await screen.findByText(/3 分钟后再试/)).toBeInTheDocument();
    expect(screen.getByLabelText("补充说明")).toBeInTheDocument();
  });

  it("keeps correction submission visibly disabled while it is pending", async () => {
    let finishSubmission!: (response: Response) => void;
    setFetch((url) =>
      url === "/api/corrections"
        ? new Promise<Response>((resolve) => { finishSubmission = resolve; })
        : Response.json({ currentMall: null, groups: [], cacheStatus: "fresh" }),
    );
    render(<HomePage />);
    await userEvent.click(screen.getByRole("button", { name: "使用我的位置" }));
    locationSuccess({ coords: { longitude: 121.49, latitude: 31.24 } } as GeolocationPosition);
    await userEvent.click(await screen.findByRole("button", { name: "补充遗漏门店" }));
    await userEvent.type(screen.getByLabelText("门店名称"), "测试茶饮店");
    await userEvent.type(screen.getByLabelText("补充说明"), "这里新开了一家店");
    await userEvent.click(screen.getByRole("button", { name: "提交纠错" }));

    expect(screen.getByRole("button", { name: "提交中" })).toBeDisabled();
    finishSubmission(Response.json({ ok: true }, { status: 201 }));
    expect(await screen.findByText("感谢，你的反馈已记录")).toBeInTheDocument();
  });
});
