import { expect, test } from "@playwright/test";

const mallResponse = {
  currentMall: { id: "mall-1", name: "上海国金中心", address: "世纪大道8号", distanceM: 80 },
  groups: [
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
  ],
  cacheStatus: "fresh",
};

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/nearby", (route) => route.fulfill({ json: mallResponse }));
});

async function mockLocation(page: import("@playwright/test").Page, mode: "success" | "denied") {
  await page.addInitScript(({ locationMode }) => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(
          onSuccess: PositionCallback,
          onError?: PositionErrorCallback,
        ) {
          if (locationMode === "success") {
            onSuccess({
              coords: {
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                latitude: 31.24,
                longitude: 121.49,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            });
            return;
          }
          onError?.({ code: 1, message: "permission denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        },
      },
    });
  }, { locationMode: mode });
}

test("mall mode supports filtering, map/list selection and copy feedback", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  await expect(page.getByRole("heading", { name: "上海国金中心" })).toBeVisible();
  await page.getByRole("tab", { name: "咖啡 1" }).click();
  await expect(page.getByRole("button", { name: "选择M Stand" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择喜茶" })).toHaveCount(0);

  await page.getByRole("tab", { name: "全部 3" }).click();
  await page.getByRole("button", { name: "收起门店列表" }).click();
  await page.getByRole("button", { name: "上海国金中心，2 家门店" }).click();
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "expanded");
  await page.getByRole("button", { name: "选择喜茶" }).click();
  await page.getByRole("button", { name: "复制喜茶品牌名" }).click();
  await expect(page.getByRole("status")).toContainText("已复制，可前往微信搜索");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("nearby mode preserves confirmed mall groups and street stores", async ({ page }) => {
  await mockLocation(page, "success");
  await page.route("**/api/nearby", (route) =>
    route.fulfill({ json: { ...mallResponse, currentMall: null } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();
  await expect(page.getByRole("button", { name: "查看周边街铺门店" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看上海国金中心门店" })).toBeVisible();
});

test("manual search works after denied location and throttled corrections stay visible", async ({ context, page }) => {
  await context.clearPermissions();
  await mockLocation(page, "denied");
  await page.route("**/api/search-place**", (route) =>
    route.fulfill({ json: { results: [{ label: "环贸iapm", address: "淮海中路999号", location: { lng: 121.456, lat: 31.217 } }] } }),
  );
  await page.route("**/api/nearby", (route) =>
    route.fulfill({ json: { currentMall: null, groups: [], cacheStatus: "fresh" } }),
  );
  await page.route("**/api/corrections", (route) =>
    route.fulfill({
      status: 429,
      json: { error: { code: "RATE_LIMITED", message: "每五分钟只能提交一次", retryable: true }, retryAfterSeconds: 180 },
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();
  await page.getByRole("searchbox", { name: "搜索上海商场或地点" }).fill("环贸");
  await page.getByRole("button", { name: "搜索" }).click();
  await page.getByRole("button", { name: /环贸iapm/ }).click();
  await page.getByRole("button", { name: "补充遗漏门店" }).click();
  await page.getByLabel("门店名称").fill("测试茶饮店");
  await page.getByLabel("补充说明").fill("这里新开了一家店");
  await page.getByRole("button", { name: "提交纠错" }).click();
  await expect(page.getByText(/3 分钟后再试/)).toBeVisible();
  await expect(page.getByLabel("补充说明")).toBeVisible();
});
