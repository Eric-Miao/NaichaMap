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

const testStyle = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#f6f0e5" } }],
};

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/nearby", (route) => route.fulfill({ json: mallResponse }));
  // Keep the browser test deterministic: the map transform and markers are what
  // these tests exercise, not the CDN availability of the basemap tiles.
  await page.route("**/positron-gl-style/style.json", (route) => route.fulfill({ json: testStyle }));
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

test("entry directory rows are full width and search controls are 50px", async ({ page }) => {
  await page.goto("/");

  for (const name of ["使用我的位置", "搜索商场或地点"]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeVisible();
    const geometry = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement!.getBoundingClientRect();
      return { width: rect.width, parent: parent.width, height: rect.height };
    });
    expect(geometry.width).toBeCloseTo(geometry.parent, 0);
    expect(geometry.height).toBeGreaterThanOrEqual(68);
    await expect(button.locator("svg").first()).toHaveAttribute("aria-hidden", "true");
  }

  await page.getByRole("button", { name: "搜索商场或地点" }).click();
  const inputHeight = await page.getByRole("searchbox", { name: "搜索上海商场或地点" })
    .evaluate((element) => element.getBoundingClientRect().height);
  const buttonHeight = await page.getByRole("button", { name: "搜索", exact: true })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(inputHeight).toBe(50);
  expect(buttonHeight).toBe(50);
});

test("unified nearby mode supports filtering, map/list selection and copy feedback", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  await expect(page.getByRole("heading", { name: "附近好喝的", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "展开门店列表" }).click();
  await page.getByRole("button", { name: "咖啡 1" }).click();
  await expect(page.getByRole("button", { name: "选择M Stand" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择喜茶" })).toHaveCount(0);

  await page.getByRole("button", { name: "全部 3" }).click();
  await page.getByRole("button", { name: "收起门店列表" }).click();
  await page.getByRole("button", { name: "上海国金中心，2 家门店" }).click();
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "expanded");
  await page.getByRole("button", { name: "选择喜茶" }).click();
  await page.getByRole("button", { name: "复制喜茶品牌名" }).click();
  await expect(page.getByRole("status")).toContainText("已复制，可前往微信搜索");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("location and category filters apply together to the map and list", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  await page.getByRole("button", { name: "上海国金中心 2" }).click();
  await expect(page.getByRole("button", { name: "选择鲜果饮品" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "上海国金中心，2 家门店" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "茶饮 1" })).toBeVisible();
  await page.getByRole("button", { name: "咖啡 1" }).click();
  await expect(page.getByRole("button", { name: "上海国金中心，1 家门店" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择M Stand" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择喜茶" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "全部地点 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "上海国金中心 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "周边街铺 0" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("drawer swipe owns the gesture without scrolling or reopening", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const drawer = page.getByTestId("store-drawer");
  await page.getByRole("button", { name: "展开门店列表" }).click();
  const handle = page.getByRole("button", { name: "收起门店列表" });
  await expect(drawer).toHaveAttribute("data-state", "expanded");
  await expect(handle).toHaveCSS("touch-action", "none");

  await handle.evaluate((element) => {
    const start = new Touch({ identifier: 0, target: element, clientX: 180, clientY: 100 });
    const end = new Touch({ identifier: 0, target: element, clientX: 180, clientY: 180 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, changedTouches: [end] }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  });

  await expect(drawer).toHaveAttribute("data-state", "collapsed");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.getByTestId("store-drawer").evaluate(
    (element) => getComputedStyle(element).overscrollBehavior,
  )).toContain("contain");
});

test("map drawer uses one content rail and stays within a 360px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const leftEdges = await Promise.all([
    page.getByRole("heading", { name: "附近好喝的", level: 1 }).evaluate((element) => element.getBoundingClientRect().left),
    page.getByRole("heading", { name: "门店目录", level: 2 }).evaluate((element) => element.getBoundingClientRect().left),
    page.getByRole("button", { name: "全部 3" }).evaluate((element) => element.getBoundingClientRect().left),
    page.getByRole("article", { name: "喜茶门店信息" }).evaluate((element) => element.getBoundingClientRect().left),
  ]);
  expect(Math.max(...leftEdges) - Math.min(...leftEdges)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("beverage markers remain legible and feedback follows the shell rail at medium widths", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const contrast = await page.getByRole("button", { name: "鲜果饮品", exact: true }).evaluate((element) => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (rgb: number[]) => rgb
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const index = element.querySelector('[class*="pinIndex"]')!;
    const path = element.querySelector("path")!;
    const foreground = luminance(parse(getComputedStyle(index).color));
    const background = luminance(parse(getComputedStyle(path).fill));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);

  const rightRail = await page.evaluate(() => {
    const shell = document.querySelector("main");
    const feedback = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "信息有误？");
    if (!shell || !feedback) return null;
    return shell.getBoundingClientRect().right - feedback.getBoundingClientRect().right;
  });
  expect(rightRail).toBe(16);
});

test("correction dialog centers on desktop and keeps aligned form controls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();
  await page.getByRole("button", { name: "信息有误？" }).click();

  const dialog = page.getByRole("dialog", { name: "补充或纠错" });
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const controls = Array.from(element.querySelectorAll("select,input,textarea,button[type='submit']"));
    return {
      dialogCenter: rect.top + rect.height / 2,
      viewportCenter: window.innerHeight / 2,
      widths: controls.map((control) => control.getBoundingClientRect().width),
    };
  });
  expect(Math.abs(geometry.dialogCenter - geometry.viewportCenter)).toBeLessThanOrEqual(2);
  expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThanOrEqual(1);
});

test("the URL keeps the view and restores it after a reload", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();
  await page.getByRole("button", { name: "展开门店列表" }).click();
  await page.getByRole("button", { name: "咖啡 1" }).click();

  await expect(page).toHaveURL(/filter=coffee/);
  await expect(page).toHaveURL(/lat=/);

  await page.reload();
  await expect(page.getByRole("button", { name: "咖啡 1" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "选择M Stand" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择喜茶" })).toHaveCount(0);
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "expanded");
});

test("browser back and forward move between search and the entry", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");

  await page.getByRole("button", { name: "搜索商场或地点" }).click();
  await expect(page).toHaveURL(/mode=search/);
  await expect(page.getByRole("searchbox", { name: "搜索上海商场或地点" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("button", { name: "使用我的位置" })).toBeVisible();

  await page.goForward();
  await expect(page.getByRole("searchbox", { name: "搜索上海商场或地点" })).toBeVisible();
});

test("map pans with a drag, keeps markers attached and can reset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const mall = page.getByRole("button", { name: "上海国金中心，2 家门店" });
  await expect(mall).toBeVisible();
  const before = await mall.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(320, 210);
  await page.mouse.down();
  await page.mouse.move(240, 210, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(450);

  const after = await mall.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(20);

  const reset = page.getByRole("button", { name: "回到门店范围" });
  await expect(reset).toBeVisible();
  await reset.click();
  await page.waitForTimeout(900);

  const restored = await mall.boundingBox();
  expect(Math.abs(restored!.x - before!.x)).toBeLessThan(10);
  expect(Math.abs(restored!.y - before!.y)).toBeLessThan(10);
});

test("drawer slides over the map without resizing it and scrolls to the last row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const drawer = page.getByTestId("store-drawer");
  const map = page.locator('[class*="mapFrame"]');
  const collapsed = await drawer.boundingBox();
  const mapBefore = await map.boundingBox();
  expect(collapsed).not.toBeNull();

  await page.getByRole("button", { name: "展开门店列表" }).click();
  await page.waitForTimeout(450);
  const expanded = await drawer.boundingBox();
  const mapAfter = await map.boundingBox();
  expect(expanded!.y).toBeLessThan(collapsed!.y - 60);
  expect(mapAfter!.height).toBeCloseTo(mapBefore!.height, 0);

  await page.getByRole("button", { name: "收起门店列表" }).click();
  await page.waitForTimeout(450);

  const list = page.getByTestId("store-list");
  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole("button", { name: "选择鲜果饮品" })).toBeVisible();
  const lastRow = await page.getByRole("button", { name: "选择鲜果饮品" }).boundingBox();
  expect(lastRow!.y).toBeLessThan(830);
});

test("selecting a store row collapses the sheet and highlights its pin", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();
  await page.getByRole("button", { name: "展开门店列表" }).click();

  await page.getByRole("button", { name: "选择喜茶" }).click();
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "collapsed");
  await expect(page.getByRole("article", { name: "喜茶门店信息" })).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "喜茶", exact: true })).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "上海国金中心，2 家门店" })).toHaveAttribute("data-selected", "true");
});

test("clicking a store pin highlights its row", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  await page.getByRole("button", { name: "鲜果饮品", exact: true }).click();
  await expect(page.getByRole("article", { name: "鲜果饮品门店信息" })).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "鲜果饮品", exact: true })).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "collapsed");
});

test("clicking a mall pin expands the list and highlights the group header", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  await page.getByRole("button", { name: "上海国金中心，2 家门店" }).click();
  await expect(page.getByTestId("store-drawer")).toHaveAttribute("data-state", "expanded");
  await expect(page.getByRole("button", { name: "查看上海国金中心门店" })).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("button", { name: "上海国金中心，2 家门店" })).toHaveAttribute("data-selected", "true");
});

test("selected map markers play their press animation", async ({ page }) => {
  await mockLocation(page, "success");
  await page.goto("/");
  await page.getByRole("button", { name: "使用我的位置" }).click();

  const mall = page.getByRole("button", { name: "上海国金中心，2 家门店" });
  await mall.click();
  expect(await mall.evaluate((element) => getComputedStyle(element).animationName)).toContain("mall-pop");
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
