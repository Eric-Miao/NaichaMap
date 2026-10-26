# 上海奶茶地图 V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个部署在 Vercel 的上海移动端饮品店地图，按需从高德获取并缓存门店，在商场优先或附近一公里模式下通过地图与上滑列表展示，并支持匿名纠错。

**Architecture:** 使用 Next.js App Router 承载页面和服务端 Route Handlers。浏览器只调用本项目的 `/api/*`；服务端通过 `supabase-js` 使用 HTTPS Data API/RPC 访问 Supabase，并通过高德 Web Service 获取外部 POI。PostGIS RPC 负责空间查询、商场判断、缓存认领与纠错限流，网页运行时不依赖 PostgreSQL TCP 直连。

**Tech Stack:** Next.js、React、TypeScript、Tailwind CSS、shadcn/ui、MapCN/MapLibre GL JS、Supabase/PostgreSQL/PostGIS、Zod、Vitest、Testing Library、Playwright

**Spec:** `docs/superpowers/specs/2026-10-26-naicha-map-design.md`

## Global Constraints

- V1 仅覆盖上海；服务边界框固定为经度 `120.85..122.20`、纬度 `30.65..31.90`，附近半径固定为 `1000` 米。
- 查询网格按经纬度各 `0.005°` 对齐；高德抓取以网格中心为圆心、`1500` 米为半径，缓存有效期固定 `30` 天。
- 浏览器、地图和 PostGIS 使用 WGS84；高德请求与原始高德坐标使用 GCJ-02，两个坐标字段不得混用。
- 仅展示 `tea_drink` 与 `coffee`；普通餐厅、便利店、超市和无法确定分类的 POI 不进入正式结果。
- 浏览器不直接访问正式表，不获得 Supabase Secret Key 或高德 Key；所有业务访问经过 Vercel Route Handlers。
- 不持久化、记录或在 URL 中携带用户精确坐标；`POST /api/nearby` 的请求体不得进入应用日志。
- 纠错不修改正式门店；同一 IP 的哈希值每 `5` 分钟最多提交一次，数据库不保存原始 IP。
- 首屏必须先渲染地图与底部菜单骨架；暖查询目标小于 `1.5s`，冷查询目标小于 `5s`（正常网络和外部服务可用时）。
- 环境变量只使用 `.env.local` 与 Vercel Secrets；`.env.local` 不进入 Git。
- 不引入 Python 工具；如果后续确需 Python，必须使用 `uv` 管理项目和虚拟环境。

## Review Focus

- 坐标位于上海边界外或含 `NaN`/超范围值时，API 必须返回稳定的 `INVALID_LOCATION`，且不得调用高德。
- 高德超时、限额或格式变化时，有旧缓存应返回旧数据与 `stale` 状态；无缓存应返回可重试错误且不泄漏上游响应。
- 两个实例同时冷启动同一网格时，只允许一个请求取得刷新租约；另一个请求不得重复调用高德。
- 商场归属不确定时必须降级到“附近一公里”，不能只凭距离或相似名称猜测当前商场。
- 伪造或缺失代理 IP、超长纠错文本和五分钟内重复提交必须被安全拒绝，且日志中不能出现原始 IP。

---

### Task 1: Next.js 基础、环境边界与测试框架

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/env/server.ts`
- Create: `src/lib/env/public.ts`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/env.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `getServerEnv(): ServerEnv`, `getPublicEnv(): PublicEnv`, and npm scripts `dev`, `build`, `lint`, `test`, `test:e2e`, `typecheck`.

- [ ] **Step 1: Write the failing environment tests**

Create `tests/unit/env.test.ts` with cases asserting that `getServerEnv()` rejects missing `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AMAP_WEB_SERVICE_KEY`, or `IP_HASH_SALT`, and that `getPublicEnv()` accepts an optional `NEXT_PUBLIC_MAP_STYLE_URL` without exposing any server key.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- tests/unit/env.test.ts`

Expected: FAIL because the project and environment modules do not exist.

- [ ] **Step 3: Scaffold the application and install dependencies**

Initialize the package, install the runtime stack (`next`, `react`, `react-dom`, `@supabase/supabase-js`, `zod`, `maplibre-gl`, `clsx`, `tailwind-merge`, `lucide-react`, `vaul`) and test/dev stack (`typescript`, React/Node types, ESLint, Tailwind/PostCSS, Vitest, jsdom, Testing Library, Playwright). Initialize shadcn/ui and add only the button, tabs, drawer, input, textarea, skeleton and toast primitives used by V1.

- [ ] **Step 4: Implement typed environment readers**

In `src/lib/env/server.ts`, define `ServerEnv` with `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AMAP_WEB_SERVICE_KEY`, `IP_HASH_SALT`; mark the module server-only and validate with Zod. In `src/lib/env/public.ts`, define `PublicEnv` with optional `NEXT_PUBLIC_MAP_STYLE_URL`. Add names but no values to `.env.example`.

- [ ] **Step 5: Add the minimal app shell and scripts**

Create the App Router layout, a placeholder home page, global mobile viewport styles, and scripts for lint, typecheck, unit tests, E2E tests and build.

- [ ] **Step 6: Verify the foundation**

Run: `npm test -- tests/unit/env.test.ts && npm run typecheck && npm run lint && npm run build`

Expected: all commands exit `0`; the production build contains `/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs components.json src .env.example vitest.config.ts vitest.setup.ts playwright.config.ts tests/unit/env.test.ts
git commit -m "chore: scaffold Next.js application"
```

### Task 2: Supabase schema, PostGIS RPC and access controls

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202610260001_init.sql`
- Create: `supabase/tests/database.test.sql`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/types.ts`
- Test: `tests/unit/supabase-server.test.ts`

**Interfaces:**
- Consumes: `getServerEnv(): ServerEnv` from Task 1.
- Produces: `createAdminClient(): SupabaseClient<Database>` plus RPCs `nearby_stores`, `claim_search_area`, `finish_search_area`, `submit_correction` and generated-style `Database` types.

- [ ] **Step 1: Write failing database assertions**

In `supabase/tests/database.test.sql`, assert that PostGIS is enabled; the four tables and enum/check constraints from the spec exist; `stores.location_wgs84` has a GiST index; `(provider, provider_place_id)` is unique; anonymous roles cannot select or mutate formal tables; and the four RPCs exist with execute privileges revoked from `anon` and `authenticated`.

- [ ] **Step 2: Run the database test and verify it fails**

Run: `npx supabase db reset && npx supabase test db`

Expected: FAIL because the migration is absent.

- [ ] **Step 3: Implement the schema migration**

Create `brands`, `malls`, `stores`, `search_areas`, and `correction_logs` with the exact fields and statuses from the spec. Store WGS84 points as `geography(Point,4326)`, GCJ-02 as explicit numeric longitude/latitude columns, and optional mall boundaries as `geography(Polygon,4326)`. Enable RLS on every table and grant no direct browser access.

- [ ] **Step 4: Implement spatial and cache RPCs**

Define:

- `nearby_stores(p_lng double precision, p_lat double precision, p_radius_m integer default 1000)` returning active stores, mall data and `distance_m`, ordered by distance.
- `claim_search_area(p_cell_id text, p_center_lng double precision, p_center_lat double precision, p_now timestamptz)` returning `{ should_fetch, lease_token, has_stale_data }`; use an atomic upsert and a `30` second lease so only one caller refreshes a cell.
- `finish_search_area(p_cell_id text, p_lease_token uuid, p_result_count integer, p_success boolean)` setting `expires_at = now() + interval '30 days'` only for the lease owner.
- `submit_correction(...)` atomically rejecting an `ip_hash` seen within `5 minutes`, then inserting only into `correction_logs`.

- [ ] **Step 5: Test manual locks and concurrent claims**

Extend `database.test.sql` to assert that an upsert cannot overwrite fields named in `manual_lock_fields`, two immediate claims yield exactly one `should_fetch = true`, an expired lease can be reclaimed, and two corrections with the same hash inside five minutes produce one row.

- [ ] **Step 6: Add the server-only Supabase client**

Implement `createAdminClient()` using `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, with session persistence and token refresh disabled. Add a unit test that verifies the secret is passed only by this server-only module and never exported from public environment code.

- [ ] **Step 7: Verify the database boundary**

Run: `npx supabase db reset && npx supabase test db && npm test -- tests/unit/supabase-server.test.ts && npm run typecheck`

Expected: all database and unit assertions pass.

- [ ] **Step 8: Commit**

```bash
git add supabase src/lib/supabase tests/unit/supabase-server.test.ts
git commit -m "feat: add PostGIS data model and RPCs"
```

### Task 3: Coordinates, query grid, POI classification and AMap gateway

**Files:**
- Create: `src/lib/geo/coordinates.ts`
- Create: `src/lib/geo/grid.ts`
- Create: `src/lib/domain/store.ts`
- Create: `src/lib/amap/types.ts`
- Create: `src/lib/amap/classify.ts`
- Create: `src/lib/amap/normalize.ts`
- Create: `src/lib/amap/client.ts`
- Create: `tests/unit/coordinates.test.ts`
- Create: `tests/unit/grid.test.ts`
- Create: `tests/unit/classify.test.ts`
- Create: `tests/unit/normalize-poi.test.ts`
- Create: `tests/unit/amap-client.test.ts`
- Create: `tests/fixtures/amap/around-page-1.json`
- Create: `tests/fixtures/amap/around-page-2.json`
- Create: `tests/fixtures/amap/error-limit.json`

**Interfaces:**
- Consumes: `getServerEnv(): ServerEnv` from Task 1.
- Produces: `wgs84ToGcj02(point): GeoPoint`, `gcj02ToWgs84(point): GeoPoint`, `getSearchCell(point): SearchCell`, `classifyPoi(poi): StoreCategory | null`, `normalizePoi(poi): NormalizedPoi`, and `AmapClient` methods `searchBeverages`, `searchMalls`, `searchPlaces`.

- [ ] **Step 1: Write failing coordinate and grid tests**

Assert golden Shanghai WGS84↔GCJ-02 conversions within `15` meters, out-of-China coordinates remain unchanged, invalid coordinates throw `InvalidLocationError`, nearby points in one `0.005°` cell share a cell ID, and a cell center is stable and reversible.

- [ ] **Step 2: Run the geo tests and verify they fail**

Run: `npm test -- tests/unit/coordinates.test.ts tests/unit/grid.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the geo utilities**

Define `GeoPoint = { lng: number; lat: number }` and `SearchCell = { id: string; center: GeoPoint; fetchRadiusM: 1500 }`. Validate finite WGS84 ranges and Shanghai service bounds before any provider request.

- [ ] **Step 4: Write failing classification and provider tests**

Use fixtures to assert tea/coffee inclusion, restaurant/convenience/supermarket exclusion, unknown POIs returning `null`, canonical brand/branch splitting, pagination de-duplication by provider ID, timeout mapping, quota mapping and rejection of malformed provider coordinates.

- [ ] **Step 5: Run provider tests and verify they fail**

Run: `npm test -- tests/unit/classify.test.ts tests/unit/normalize-poi.test.ts tests/unit/amap-client.test.ts`

Expected: FAIL because classifier and client do not exist.

- [ ] **Step 6: Implement classification and the AMap adapter**

Use AMap type codes `050500` (咖啡厅) and `050700` (冷饮店), plus individual keyword searches for `奶茶`, `茶饮`, `果茶`, `咖啡`, `饮品店`; query malls with `060101` (购物中心). Explicitly reject restaurant type families `050100..050400` and convenience/supermarket families before keyword matching. `normalizePoi` strips a trailing parenthesized branch label, maps aliases from `brands`, and otherwise uses the cleaned POI name as `canonicalName` with `brand_id = null`. Implement `AmapClient` with an injected `fetch`, a `3500ms` timeout, at most `3` pages per keyword/type query, no logging of URLs containing keys, and normalized provider errors `AMAP_TIMEOUT`, `AMAP_QUOTA`, `AMAP_UPSTREAM`, `AMAP_INVALID_RESPONSE`.

- [ ] **Step 7: Verify domain adapters**

Run: `npm test -- tests/unit/coordinates.test.ts tests/unit/grid.test.ts tests/unit/classify.test.ts tests/unit/normalize-poi.test.ts tests/unit/amap-client.test.ts && npm run typecheck`

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/geo src/lib/domain src/lib/amap tests/unit tests/fixtures/amap
git commit -m "feat: add geospatial and AMap adapters"
```

### Task 4: Nearby orchestration, mall confidence and cache fallback

**Files:**
- Create: `src/features/nearby/contracts.ts`
- Create: `src/features/nearby/service.ts`
- Create: `src/features/nearby/mall-confidence.ts`
- Create: `src/app/api/nearby/route.ts`
- Create: `tests/unit/nearby-service.test.ts`
- Create: `tests/unit/mall-confidence.test.ts`
- Create: `tests/unit/nearby-route.test.ts`

**Interfaces:**
- Consumes: Supabase RPCs from Task 2 and geo/AMap interfaces from Task 3.
- Produces: `getNearby(input: NearbyInput): Promise<NearbyResponse>` and `POST /api/nearby` with stable success/error contracts.

- [ ] **Step 1: Define contracts and failing route validation tests**

Define `NearbyInput`, `NearbyResponse`, `MallSummary`, `StoreSummary`, `StoreGroup`, `CacheStatus = 'fresh' | 'refreshed' | 'stale'`, and stable API errors. Test malformed JSON, missing/invalid/out-of-Shanghai coordinates, `POST`-only behavior and absence of coordinates from returned errors.

- [ ] **Step 2: Run route tests and verify they fail**

Run: `npm test -- tests/unit/nearby-route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Write failing orchestration and mall-confidence tests**

Cover fresh cache, first cold fetch, expired cache refresh, one-winner concurrent claim, stale fallback after AMap failure, no-cache provider failure, de-duplication, manual locked fields, missing refreshed POIs becoming `possibly_closed` rather than deleted, and empty results. For mall confidence, assert boundary containment wins; otherwise require an exact provider parent-POI match, the matching mall result within `300m`, and a normalized mall-name match in the store or mall address. Distance-only and name-similarity-only evidence always return `null`.

- [ ] **Step 4: Run service tests and verify they fail**

Run: `npm test -- tests/unit/nearby-service.test.ts tests/unit/mall-confidence.test.ts`

Expected: FAIL because orchestration is absent.

- [ ] **Step 5: Implement `getNearby`**

Query the exact `1000m` result first, claim the snapped cell only when absent/expired, have the winner fetch and normalize AMap data, upsert by provider ID without overwriting manual locks, finish the cache lease, and query exact results again. A losing concurrent request may poll cache completion for up to `3000ms`; after that it returns stale data or `CACHE_REFRESHING` with `retryable: true`.

- [ ] **Step 6: Implement grouping and the route**

When mall confidence is high, set `currentMall` and order its stores before outside stores. Otherwise set `currentMall: null`, group only confirmed `mall_id` stores by mall distance and put remaining stores into `street`. Keep all input coordinates in memory only and explicitly disable request-body logging.

- [ ] **Step 7: Verify the nearby vertical slice**

Run: `npm test -- tests/unit/nearby-route.test.ts tests/unit/nearby-service.test.ts tests/unit/mall-confidence.test.ts && npm run typecheck`

Expected: all tests pass, including all five Review Focus cases owned by this task.

- [ ] **Step 8: Commit**

```bash
git add src/features/nearby src/app/api/nearby tests/unit
git commit -m "feat: add cached nearby search API"
```

### Task 5: Manual place search and anonymous corrections

**Files:**
- Create: `src/features/place-search/service.ts`
- Create: `src/app/api/search-place/route.ts`
- Create: `src/features/corrections/contracts.ts`
- Create: `src/features/corrections/ip.ts`
- Create: `src/features/corrections/service.ts`
- Create: `src/app/api/corrections/route.ts`
- Create: `tests/unit/search-place-route.test.ts`
- Create: `tests/unit/corrections-route.test.ts`
- Create: `tests/unit/ip.test.ts`

**Interfaces:**
- Consumes: `AmapClient.searchPlaces` from Task 3, `submit_correction` RPC from Task 2.
- Produces: `GET /api/search-place?q=`, `POST /api/corrections`, `hashClientIp(ip, salt): string`, and correction success/rate-limit responses.

- [ ] **Step 1: Write failing place-search tests**

Assert trimmed queries of `2..80` characters, Shanghai-only provider requests, a maximum of `10` sanitized results, and stable handling of empty, timeout and quota responses.

- [ ] **Step 2: Write failing correction/IP tests**

Assert extraction of the first valid address from Vercel's `x-forwarded-for` header only when `VERCEL=1`, rejection when no trustworthy platform IP exists, deterministic HMAC-SHA256 hashing with the private salt, no raw IP in RPC inputs/logs, allowed issue types, details limited to `500` characters, plain-text treatment, success insertion, and a `429` response with `retryAfterSeconds` for a second submission inside five minutes. Unit tests inject an IP resolver rather than trusting arbitrary local headers.

- [ ] **Step 3: Run tests and verify they fail**

Run: `npm test -- tests/unit/search-place-route.test.ts tests/unit/corrections-route.test.ts tests/unit/ip.test.ts`

Expected: FAIL because the routes and services do not exist.

- [ ] **Step 4: Implement both server routes**

Use Zod at each route boundary. Search results expose only display label, normalized address and WGS84 point. Corrections call the atomic RPC and never write `stores`; error responses contain stable code, user message and retryability only.

- [ ] **Step 5: Verify API security**

Run: `npm test -- tests/unit/search-place-route.test.ts tests/unit/corrections-route.test.ts tests/unit/ip.test.ts && npm run typecheck`

Expected: all tests pass; the Review Focus correction cases are covered.

- [ ] **Step 6: Commit**

```bash
git add src/features/place-search src/features/corrections src/app/api/search-place src/app/api/corrections tests/unit
git commit -m "feat: add place search and anonymous corrections"
```

### Task 6: Client state, category filtering and API client

**Files:**
- Create: `src/features/map/api.ts`
- Create: `src/features/map/reducer.ts`
- Create: `src/features/map/use-nearby.ts`
- Create: `src/features/map/selectors.ts`
- Create: `tests/unit/map-reducer.test.ts`
- Create: `tests/unit/map-selectors.test.ts`

**Interfaces:**
- Consumes: `NearbyResponse` from Task 4 and search/correction contracts from Task 5.
- Produces: `MapState`, `MapAction`, `mapReducer`, `selectVisibleGroups`, and `useNearby()` for presentation components.

- [ ] **Step 1: Write failing reducer and selector tests**

Cover every required page state: permission request, locating, cache loading, provider refresh, mall results, nearby results, denied/unavailable location, empty, stale, recoverable error, correction success and rate limit. Assert `all`, `tea_drink`, and `coffee` filters preserve mall grouping and order; selecting a marker/store/group updates one canonical selected ID.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/unit/map-reducer.test.ts tests/unit/map-selectors.test.ts`

Expected: FAIL because the client state modules do not exist.

- [ ] **Step 3: Implement the API client and state model**

Use `POST` JSON for coordinates, never encode coordinates into a URL, never log request bodies, and support aborting stale requests. The reducer is the single source of truth for drawer state, filter, selected marker/store/group and loading/error status.

- [ ] **Step 4: Verify client behavior**

Run: `npm test -- tests/unit/map-reducer.test.ts tests/unit/map-selectors.test.ts && npm run typecheck`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/map tests/unit/map-reducer.test.ts tests/unit/map-selectors.test.ts
git commit -m "feat: add map client state model"
```

### Task 7: Mobile map, semantic mall markers and upward drawer

**Files:**
- Create: `src/components/map/map-shell.tsx`
- Create: `src/components/map/store-map.tsx`
- Create: `src/components/map/map-markers.tsx`
- Create: `src/components/stores/store-drawer.tsx`
- Create: `src/components/stores/category-tabs.tsx`
- Create: `src/components/stores/store-group.tsx`
- Create: `src/components/stores/store-card.tsx`
- Create: `src/components/stores/copy-brand-button.tsx`
- Create: `tests/components/store-drawer.test.tsx`
- Create: `tests/components/store-map.test.tsx`
- Create: `tests/components/copy-brand-button.test.tsx`

**Interfaces:**
- Consumes: state/selectors from Task 6 and `NearbyResponse` presentation types from Task 4.
- Produces: the approved map-first A+B layout with two-way map/list selection callbacks.

- [ ] **Step 1: Write failing component interaction tests**

Assert collapsed and expanded drawer states, sticky tabs with correct counts, category filtering, mall sections plus “周边街铺”, group/store click callbacks, marker-to-list selection, copy action writing only canonical brand name, and toast text `已复制，可前往微信搜索`.

- [ ] **Step 2: Run component tests and verify they fail**

Run: `npm test -- tests/components/store-drawer.test.tsx tests/components/store-map.test.tsx tests/components/copy-brand-button.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the drawer and cards**

Use the approved warm neutral visual direction from the prototype: map-first viewport, white upward drawer, `12..16px` internal padding on visible containers, `44px` minimum touch targets, sticky category pills and compact store rows. Preserve mall grouping under filters and render no floor/navigation/mini-program controls.

- [ ] **Step 4: Implement the MapCN/MapLibre wrapper**

Keep all library-specific code in `store-map.tsx`. Accept `styleUrl`, user point, semantic mall markers and individual street/store markers. Mall markers display name/count; selecting one expands and scrolls the matching list group. Use visual clustering only for overlapping map points and never mutate semantic list groups.

- [ ] **Step 5: Verify interaction and accessibility**

Run: `npm test -- tests/components/store-drawer.test.tsx tests/components/store-map.test.tsx tests/components/copy-brand-button.test.tsx && npm run typecheck && npm run lint`

Expected: tests pass; interactive controls have accessible names and keyboard activation.

- [ ] **Step 6: Commit**

```bash
git add src/components tests/components
git commit -m "feat: add map and upward store drawer"
```

### Task 8: Location flow, manual fallback and complete page states

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/features/location/use-location.ts`
- Create: `src/components/location/location-prompt.tsx`
- Create: `src/components/location/place-search.tsx`
- Create: `src/components/feedback/page-status.tsx`
- Create: `src/components/corrections/correction-dialog.tsx`
- Create: `tests/components/home-page.test.tsx`
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: API/state from Tasks 4–6 and presentation components from Task 7.
- Produces: the complete `/` user journey.

- [ ] **Step 1: Write failing home-page state tests**

Mock geolocation and APIs to assert the full state list from the spec, including permission denial leading to manual search, stale cache timestamp display, retry after provider failure, no-results omission correction, correction success and rate-limit messaging.

- [ ] **Step 2: Run the home tests and verify they fail**

Run: `npm test -- tests/components/home-page.test.tsx`

Expected: FAIL because the page flow is incomplete.

- [ ] **Step 3: Implement location and manual search flows**

Request geolocation only after a clear user action, set a bounded timeout, and discard coordinates after the nearby request resolves. Selecting a manual place immediately calls the same nearby flow with its WGS84 point; do not place that point in browser history or analytics.

- [ ] **Step 4: Compose all page states and correction dialog**

Make skeletons render before map data, distinguish cache loading from provider refresh, keep stale data interactive, escape all submitted text, and send corrections only through `/api/corrections`.

- [ ] **Step 5: Add core mobile E2E coverage**

In Playwright, mock route responses and geolocation for: mall mode, nearby grouped mode, tab filtering, map/list selection, copied brand toast, denied location/manual search and correction throttling. Use a mobile viewport and assert no horizontal overflow.

- [ ] **Step 6: Verify the complete local experience**

Run: `npm test -- tests/components/home-page.test.tsx && npm run test:e2e -- tests/e2e/home.spec.ts && npm run build`

Expected: unit/E2E tests pass and production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/features/location src/components/location src/components/feedback src/components/corrections tests/components/home-page.test.tsx tests/e2e/home.spec.ts
git commit -m "feat: complete location and fallback experience"
```

### Task 9: Deployment configuration, security checks and Shanghai acceptance run

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Create: `docs/deployment.md`
- Create: `tests/acceptance/shanghai-points.json`
- Create: `scripts/validate-shanghai.ts`
- Create: `tests/unit/logging-privacy.test.ts`

**Interfaces:**
- Consumes: the complete V1 application.
- Produces: documented Vercel/Supabase setup, repeatable 12-point quality report and final release gate.

- [ ] **Step 1: Write failing privacy and configuration checks**

Assert no client bundle import path reaches `src/lib/env/server.ts`; nearby logging never includes request bodies; correction logging never includes raw IP; `.env.example` contains names only; and `.gitignore` excludes `.env.local` plus Vercel files.

- [ ] **Step 2: Run checks and verify any missing safeguards fail**

Run: `npm test -- tests/unit/logging-privacy.test.ts && npm run build`

Expected: any boundary violation fails before deployment.

- [ ] **Step 3: Add the 12-point Shanghai acceptance dataset and runner**

Include one representative mall/non-mall mix across Pudong, Huangpu, Jing’an, Xuhui, Changning, Minhang, Baoshan, Yangpu, Jiading, Qingpu, Songjiang and Fengxian. `validate-shanghai.ts` calls the local API, records warm/cold timings, groups and classifications, and writes no input coordinates to persistent logs. Require human-reviewed recall `>= 90%`, restaurant false-positive rate `< 5%`, correct known-mall assignments and safe fallback for uncertain malls.

- [ ] **Step 4: Document secure setup**

Document Supabase MCP/CLI migration application, PostGIS verification, Vercel environment variables, secret rotation, Map style configuration, AMap authorization assumptions, deployment commands and rollback. Document manual early refresh as setting the selected `search_areas.expires_at` to the past in Supabase, never deleting store rows. State that `SUPABASE_SECRET_KEY`, DB password, AMap key and IP salt must be entered directly into Vercel/local secret storage and never sent through chat or committed.

- [ ] **Step 5: Run the full release gate**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

Expected: all commands exit `0` with no skipped critical test.

Run with configured local secrets: `npm run validate:shanghai`

Expected: all 12 locations return a report; quality thresholds in the spec are met or documented as release blockers.

- [ ] **Step 6: Deploy preview and perform device smoke tests**

Deploy a Vercel preview, verify iOS Safari and Android Chrome location permission, drawer gestures, map interaction, manual search and correction flow. Confirm Vercel logs contain neither coordinates, raw IPs nor secrets.

- [ ] **Step 7: Commit**

```bash
git add README.md .env.example docs/deployment.md tests/acceptance scripts/validate-shanghai.ts tests/unit/logging-privacy.test.ts
git commit -m "docs: add deployment and acceptance gates"
```

## Final Verification

- [ ] Run `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e` from a clean checkout.
- [ ] Run `npx supabase db reset && npx supabase test db` against the local Supabase stack.
- [ ] Run the 12-point Shanghai acceptance report with authorized AMap credentials.
- [ ] Inspect `git diff --check`, `git status --short`, the client bundle and Vercel logs for secrets, precise location data and raw IPs.
- [ ] Confirm the deployed browser bundle contains no Supabase key because V1 routes all database access through Vercel, and keeps `SUPABASE_SECRET_KEY`, `AMAP_WEB_SERVICE_KEY` and `IP_HASH_SALT` server-only.
