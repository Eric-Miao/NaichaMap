import "server-only";

import type { BrandAlias, NormalizedPlace, NormalizedPoi } from "@/lib/domain/store";
import { getServerEnv } from "@/lib/env/server";
import { assertShanghaiLocation, type GeoPoint } from "@/lib/geo/coordinates";

import { classifyPoi } from "./classify";
import { normalizePlace, normalizePoi } from "./normalize";
import { AmapProviderError, type AmapPoi, type AmapSearchResponse } from "./types";

export { AmapProviderError } from "./types";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type AmapClientOptions = {
  key?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  brands?: BrandAlias[];
};

const BEVERAGE_QUERIES: Array<Record<string, string>> = [
  { types: "050500" },
  { types: "050700" },
  { keywords: "奶茶" },
  { keywords: "茶饮" },
  { keywords: "果茶" },
  { keywords: "咖啡" },
  { keywords: "饮品店" },
];

const MALL_QUERIES: Array<Record<string, string>> = [
  { types: "060101" },
  { types: "060102" },
  { keywords: "商场" },
  { keywords: "购物中心" },
];
const MALL_TYPE_CODES = new Set(["060100", "060101", "060102"]);

export class AmapClient {
  private readonly key: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly brands: BrandAlias[];

  constructor(options: AmapClientOptions = {}) {
    this.key = options.key ?? getServerEnv().AMAP_WEB_SERVICE_KEY;
    this.fetchImpl = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.brands = options.brands ?? [];
  }

  async searchBeverages(centerGcj02: GeoPoint, radius = 900): Promise<NormalizedPoi[]> {
    assertShanghaiLocation(centerGcj02);
    const results = await Promise.allSettled(
      BEVERAGE_QUERIES.map((query) =>
        this.searchPages(
          "https://restapi.amap.com/v3/place/around",
          {
            location: `${centerGcj02.lng},${centerGcj02.lat}`,
            radius: String(radius),
            ...query,
          },
          2,
        ),
      ),
    );
    const batches = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    if (batches.length === 0) {
      const firstError = results.find((result) => result.status === "rejected");
      if (firstError?.status === "rejected" && firstError.reason instanceof AmapProviderError) {
        throw firstError.reason;
      }
      throw new AmapProviderError("AMAP_UPSTREAM", "AMap beverage search failed");
    }

    const unique = this.dedupe(batches.flat());
    return unique.filter((poi) => classifyPoi(poi) !== null).map((poi) => normalizePoi(poi, this.brands));
  }

  async searchMalls(centerGcj02: GeoPoint, radius = 900): Promise<NormalizedPlace[]> {
    assertShanghaiLocation(centerGcj02);
    const results = await Promise.allSettled(
      MALL_QUERIES.map((query) =>
        this.searchPages(
          "https://restapi.amap.com/v3/place/around",
          {
            location: `${centerGcj02.lng},${centerGcj02.lat}`,
            radius: String(radius),
            ...query,
          },
          1,
        ),
      ),
    );
    const batches = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    if (batches.length === 0) {
      const firstError = results.find((result) => result.status === "rejected");
      if (firstError?.status === "rejected" && firstError.reason instanceof AmapProviderError) {
        throw firstError.reason;
      }
      throw new AmapProviderError("AMAP_UPSTREAM", "AMap mall search failed");
    }
    return this.dedupe(batches.flat())
      .filter((poi) => Boolean(poi.typecode) && MALL_TYPE_CODES.has(poi.typecode!))
      .map(normalizePlace);
  }

  async searchPlaces(query: string): Promise<NormalizedPlace[]> {
    const pois = await this.searchPages(
      "https://restapi.amap.com/v3/place/text",
      {
        keywords: query,
        city: "上海",
        citylimit: "true",
      },
      1,
    );
    return this.dedupe(pois).map(normalizePlace);
  }

  private dedupe(pois: AmapPoi[]) {
    return [...new Map(pois.map((poi) => [poi.id, poi])).values()];
  }

  private async searchPages(
    endpoint: string,
    params: Record<string, string>,
    maxPages = 1,
  ): Promise<AmapPoi[]> {
    const offset = 25;
    const first = await this.request(endpoint, { ...params, page: "1", offset: String(offset) });
    const pois = first.pois ?? [];
    const total = Number(first.count ?? pois.length);
    const pages = Number.isFinite(total)
      ? Math.min(maxPages, Math.max(1, Math.ceil(total / offset)))
      : 1;
    if (pages <= 1 || pois.length === 0) return pois;

    // Pages after the first are independent; request them together instead of
    // walking 25 results at a time with the user waiting.
    const rest = await Promise.allSettled(
      Array.from({ length: pages - 1 }, (_, index) =>
        this.request(endpoint, {
          ...params,
          page: String(index + 2),
          offset: String(offset),
        }),
      ),
    );

    return [
      ...pois,
      ...rest.flatMap((result) =>
        result.status === "fulfilled" ? (result.value.pois ?? []) : [],
      ),
    ];
  }

  private async request(endpoint: string, params: Record<string, string>): Promise<AmapSearchResponse> {
    const url = new URL(endpoint);
    for (const [name, value] of Object.entries({ ...params, key: this.key, output: "JSON" })) {
      url.searchParams.set(name, value);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { signal: controller.signal });
      if (!response.ok) throw new AmapProviderError("AMAP_UPSTREAM", "AMap request failed");

      let body: AmapSearchResponse;
      try {
        body = (await response.json()) as AmapSearchResponse;
      } catch {
        throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned invalid JSON");
      }

      if (body.status !== "1") {
        const quota = body.infocode === "10003" || /LIMIT|QUOTA/i.test(body.info ?? "");
        throw new AmapProviderError(quota ? "AMAP_QUOTA" : "AMAP_UPSTREAM", "AMap rejected the request");
      }
      if (!Array.isArray(body.pois)) {
        throw new AmapProviderError("AMAP_INVALID_RESPONSE", "AMap returned invalid POIs");
      }
      return body;
    } catch (error) {
      if (error instanceof AmapProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AmapProviderError("AMAP_TIMEOUT", "AMap request timed out");
      }
      throw new AmapProviderError("AMAP_UPSTREAM", "AMap request failed");
    } finally {
      clearTimeout(timer);
    }
  }
}
