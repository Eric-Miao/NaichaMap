import { readFile } from "node:fs/promises";

type Point = {
  district: string;
  label: string;
  point: { lng: number; lat: number };
  expectedMode: "mall" | "nearby";
  expectedMall: string | null;
  reviewComplete: boolean;
  reviewedExpectedBrands: string[];
  reviewedRestaurantNames: string[];
};

type NearbyResponse = {
  currentMall: { name: string } | null;
  groups: Array<{
    kind: "mall" | "street";
    stores: Array<{ name: string; category: "tea_drink" | "beverage" | "coffee" }>;
  }>;
  cacheStatus: string;
};

const apiBaseUrl = process.env.NAICHA_MAP_BASE_URL ?? "http://localhost:3000";
const points = JSON.parse(
  await readFile(new URL("../tests/acceptance/shanghai-points.json", import.meta.url), "utf8"),
) as Point[];

async function query(point: Point) {
  const started = performance.now();
  const response = await fetch(`${apiBaseUrl}/api/nearby`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(point.point),
  });
  const elapsedMs = Math.round(performance.now() - started);
  if (!response.ok) throw new Error(`${point.district}/${point.label}: API ${response.status}`);
  return { data: await response.json() as NearbyResponse, elapsedMs };
}

const results = [];
let expectedBrands = 0;
let foundBrands = 0;
let returnedStores = 0;
let restaurantFalsePositives = 0;
let mallChecks = 0;
let mallMatches = 0;

for (const point of points) {
  const cold = await query(point);
  const warm = await query(point);
  const stores = warm.data.groups.flatMap((group) => group.stores);
  const brandNames = new Set(stores.map((store) => store.name.toLocaleLowerCase("zh-CN")));
  const found = point.reviewedExpectedBrands.filter((brand) => brandNames.has(brand.toLocaleLowerCase("zh-CN"))).length;
  expectedBrands += point.reviewedExpectedBrands.length;
  foundBrands += found;
  returnedStores += stores.length;
  restaurantFalsePositives += point.reviewedRestaurantNames.filter((name) => brandNames.has(name.toLocaleLowerCase("zh-CN"))).length;

  const actualMode = warm.data.currentMall ? "mall" : "nearby";
  const mallMatch = point.expectedMode === "nearby"
    ? actualMode === "nearby"
    : Boolean(warm.data.currentMall?.name.includes(point.expectedMall ?? ""));
  mallChecks += 1;
  mallMatches += Number(mallMatch);
  results.push({
    district: point.district,
    label: point.label,
    coldMs: cold.elapsedMs,
    warmMs: warm.elapsedMs,
    cacheStatus: warm.data.cacheStatus,
    mode: actualMode,
    mallMatch,
    mallGroups: warm.data.groups.filter((group) => group.kind === "mall").length,
    streetStores: warm.data.groups.find((group) => group.kind === "street")?.stores.length ?? 0,
    storeCount: stores.length,
    reviewedRecall: point.reviewedExpectedBrands.length ? found / point.reviewedExpectedBrands.length : null,
  });
}

const recall = expectedBrands ? foundBrands / expectedBrands : null;
const restaurantFalsePositiveRate = returnedStores ? restaurantFalsePositives / returnedStores : 0;
const mallAccuracy = mallChecks ? mallMatches / mallChecks : 0;
const blockers = [
  ...(points.some((point) => !point.reviewComplete) ? ["12 个点尚未完成人工复核"] : []),
  ...(recall === null ? ["人工复核品牌基线为空"] : recall < 0.9 ? [`召回率 ${(recall * 100).toFixed(1)}% 低于 90%`] : []),
  ...(restaurantFalsePositiveRate >= 0.05 ? [`餐厅误报率 ${(restaurantFalsePositiveRate * 100).toFixed(1)}% 不低于 5%`] : []),
  ...(mallAccuracy < 1 ? [`商场/附近判断正确率 ${(mallAccuracy * 100).toFixed(1)}%，存在错误`] : []),
];

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  points: results,
  summary: { recall, restaurantFalsePositiveRate, mallAccuracy, blockers },
}, null, 2));

if (blockers.length) process.exitCode = 1;
