# 架构说明

## 依赖方向

```
app/（路由与页面）
  ├─ components/（展示组件，CSS Modules）
  └─ features/（状态与用例）
        ├─ map/        客户端状态、选择器、API 调用
        ├─ nearby/     服务端用例、仓储接口、分组规则
        ├─ location/   浏览器定位
        └─ place-search/ 地点检索用例
              └─ lib/（amap、geo、supabase、http、env）
```

- `app/` 只负责把页面状态映射到组件，不包含网络或数据整形逻辑。
- `features/*/service.ts` 可用 `server-only`；`contracts.ts` 保持可被客户端安全导入。
- `lib/` 不反向依赖 `features/`。
- 所有对外响应使用 `lib/http/responses.ts` 的同一错误信封：`{ error: { code, message, retryable } }`。

## 附近门店

`features/nearby` 分成三个模块：

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `service.ts` | 刷新决策、并发租约、降级、诊断事件 | 仓储接口 + 高德客户端 |
| `repository.ts` | Supabase/PostGIS 适配器；商场按 GCJ-02 包围盒查询 | `createAdminClient` |
| `grouping.ts` | 把扁平缓存行整理成“当前商场 / 周边商场 / 周边街铺” | 纯函数 |
| `mall-confidence.ts` | 商场归属证据与距离计算 | 纯函数 |

关键接口：

```ts
type NearbyRepository = {
  getNearby(point): Promise<NearbyStoreRecord[]>;
  getCacheState(cellId): Promise<CacheState | null>;
  claimSearchArea(cellId, center, now): Promise<SearchClaim>;
  finishSearchArea(cellId, leaseToken, resultCount, success): Promise<void>;
  saveMalls(malls): Promise<MallCandidate[]>;
  saveStores(stores, malls): Promise<void>;
  listMallCandidates(): Promise<MallCandidate[]>;
};
```

- `finishSearchArea` 显式接收 `cellId`，不再依赖“先调用 `getCacheState`”的隐式共享状态。
- 测试通过 `createNearbyService(deps)` 注入仓储、时钟、sleep 和 provider，不触碰 Supabase 或网络。
- 商场归属优先级：边界 → 高德父 POI + 500m → 名称/地址 + 500m；仅距离永不归属。
- 商场查询失败时 `allowCurrentMall: false`，避免用不完整数据声称“你在这个商场”。
- `listMallCandidates(centerGcj02, radiusM)` 只取搜索点周围 1400m 的商场，不再每次扫全表；`202611080001_mall_gcj02_index.sql` 给 GCJ-02 包围盒建索引。

## 客户端状态

- `reducer.ts`：状态收敛为 `permission / locating / loading-cache / refreshing / ready / stale / denied / unavailable / empty / error`；`screen` 和 `placeLabel` 也在这里，保证 URL、标题和页面模式一致。新数据加载会重置筛选和选中项。
- `use-nearby.ts`：串行化请求（新请求 abort 旧请求），保存**真实用户坐标**而不是缓存网格中心。
- `url.ts`：解析/序列化 `mode / lat / lng / place / filter / group / selected / drawer`，无效值安全回退。
- `selectors.ts`：`buildDirectoryView(groups, filter, groupFilter, currentMallId)` 是地图和列表的唯一数据源，产出：
  - 过滤后的分组；
  - 两组筛选各自的计数；
  - 每个门店的两位序号；
  - 每个分组的序号区间。
- 选中态、筛选态和抽屉态都在 reducer 里，组件只派发动作。

## 冷启动性能

- 饮料和商场是两组独立的高德请求，冷启动时并行发出，不再先等饮料再查商场。
- 高德每页 25 条：饮料最多取 2 页、商场和地点搜索只取 1 页；第 2 页在首页返回后并行请求，单页失败不会丢掉首页结果。
- 单次高德请求超时 3 秒；某组关键词失败只丢弃该组，其他组仍返回。
- 商场只按 1400m 包围盒查询，并和 `getNearby` 并行；`finishSearchArea` 与读取并行，少一个串行往返。
- `getNearby` 在服务端打印 `nearby_refresh`（耗时、缓存状态、门店数），不包含坐标或密钥，用于 Vercel 日志定位慢点。
- 部署新迁移后，冷启动通常从多次串行翻页降到两波并行请求 + 一次附近商场查询。

## URL 状态

- 入口是 `/`，搜索页是 `?mode=search`，地点页带 `lat/lng/place` 和可选的 `filter/group/selected/drawer`。
- 首次挂载解析 URL；有坐标时直接加载，不请求定位权限。深链的筛选/选中在数据返回后一次性应用。
- 新增地点用 `pushState`，筛选/选中/抽屉用 `replaceState`；进入搜索页也 push，浏览器前进/后退可以回到入口、搜索页或上一个地点。
- `popstate` 时按 URL 恢复：不同坐标重新加载，同坐标只应用视图；回到入口则 `RESET` 并清空用户坐标。
- URL 是原生 History API，不经过 Next 路由，避免整页请求。

## 地图

- 附近半径 500 米；高德抓取半径 900 米。两者都是 `src/lib/geo/search.ts` 的常量。
- 默认底图是 CARTO Positron（OSM 数据、WGS84、无需 key）。`NEXT_PUBLIC_MAP_STYLE_URL` 可覆盖；样式报错或 9 秒未加载会自动切换 OpenFreeMap Positron，再失败才显示示意网格。
- 门店以 WGS84 存储；调用高德时转换为 GCJ-02。
- `lib/geo/viewport.ts` 用 Web Mercator 自行拟合中心与缩放，并把经纬度投影成 CSS 像素；缩放采用 MapLibre 的 512px 瓦片约定，标记与底图共享同一套投影，因此标记始终贴合真实坐标。
- 地图可拖动/缩放（禁用旋转和倾斜）。`move`/`zoom` 事件把真实中心与缩放同步到 `liveView`，标记跟着实时投影；只有数据或容器尺寸变化时才重新拟合。
- 右下角比例尺由 `scaleBar(view)` 计算；移动地图后出现“回到门店范围”，`easeTo` 回到 `fitView`。
- 抽屉是绝对定位的 transform sheet：地图高度只由顶栏和 60svh 收起高度决定，展开时地图不重排。
- 抽屉收起态列表增加底部补偿，保证最后一排能滚到可见区；把手下拉/上推跟手，超过 30px 吸附。
- 目录展开盖住地图下半部时，标记层只保留“我的位置”点和选中标记，避免堆叠。
- `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")` 解决 Next/Turbopack 下 MapLibre worker chunk 无法加载的问题；该文件由 `scripts/copy-maplibre-worker.mjs` 在 `predev`、`prebuild`、`postinstall` 生成，不提交仓库。
- 默认 OSM 样式或 OpenFreeMap 都失败时，展示带注册网格的“示意视图”，标记仍按真实坐标缩放。

## 组件

- `MapShell` 是唯一布局壳：移动端 `header / map / drawer`，桌面端 `左目录 + 右地图`。
- `StoreDrawer` 接收已计算好的 `DirectoryView`，不重复过滤。
- 展示组件全部使用 CSS Modules，颜色/间距/半径只来自 `globals.css` 的 token。
- 地图选店与列表选店共用一个 `selectStore`：展开目录、滚动到对应行、同步高亮。
- 纠错弹层自己管理焦点陷阱、Escape、滚动锁和焦点归还。

## 测试策略

- `tests/unit/*`：纯函数、路由、环境变量、投影、比例尺、URL、选择器、仓储调用顺序。
- `tests/components/*`：可访问名称、筛选联动、空态、复制反馈、弹窗键盘行为。
- `tests/e2e/*`：真实浏览器里的定位、筛选、地图/列表联动、地图拖动与复位、标记动画、URL 刷新/前进后退、抽屉手势、桌面布局、纠错限流。
- 任何新交互都应先加一个失败断言，再实现。
