# 奶茶地图（NaichaMap）

一个面向上海的移动端附近饮品店地图。它会优先展示用户当前商场内的奶茶、饮品和咖啡店；无法可靠判断商场时，则展示 500 米内门店，并按商场聚类。

## V1 范围

- 上海范围内按需查询门店
- 奶茶、现制饮品和咖啡分类
- MapLibre + OSM 底图（CARTO Positron，失败切 OpenFreeMap）与上滑门店菜单
- 可分享的 URL：位置、筛选、选中门店和抽屉状态可恢复，支持浏览器前进/后退
- 高德查询结果规范化后缓存到 Supabase，缓存有效期 30 天
- 无需登录的纠错提交，同一 IP 每 5 分钟最多一次
- 复制品牌名后前往微信搜索

V1 不包含导航、楼层信息、小程序直达、用户账号或独立管理后台。

## 当前状态

V1 已完成本地实现：定位或手动搜索地点后，页面会展示 500 米内门店；商场判断可信时优先显示当前商场，否则保留已确认的商场分组并展示周边街铺。

## 交互与视觉

界面像一张奶茶店柜台上的纸质索引：奶油纸面、深焙茶墨文字、1px 分隔线、两位数字索引，唯一强调色是茶青。地图标记与目录行共用同一组编号；默认抽屉占 60% 屏高，首屏同时看到地图、当前商场和它的前三家店。

地图支持手指拖动和双指缩放，标记随地图实时跟随；移动后右上角出现“回到门店范围”，右下角比例尺随缩放变化。点击标记有按压、弹跳和茶色波纹反馈。

完整的颜色、字体、组件和状态规则见 [DESIGN.md](DESIGN.md)。

## URL 状态

- 查询参数记录位置与地点名、品类筛选、地点筛选、选中门店和抽屉开合。
- 切换位置会新增一条历史记录；筛选、选中和抽屉用替换，不污染后退。
- 浏览器前进/后退可以回到入口、搜索结果或上一个地点；刷新和分享链接能恢复同一视图。
- 入口是 `/`，搜索页是 `?mode=search`，地点页形如 `/?lat=31.239700&lng=121.500500&place=上海国金中心&filter=coffee`。

## 技术栈

- Vercel
- React + TypeScript
- Tailwind CSS + shadcn/ui
- MapLibre + OSM 底图（CARTO Positron，失败切 OpenFreeMap）
- Supabase PostgreSQL + PostGIS
- 高德 Web Service API（已取得适用本项目的邮件许可）

## 安全说明

高德与 Supabase 的服务端密钥不得提交到仓库。授权邮件及附件也不进入仓库。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览器打开 `http://localhost:3000`。环境变量和值的填写方式、Supabase 初始化、Vercel 发布和回滚见 [部署说明](docs/deployment.md)。

## 代码结构

```text
src/app/                 路由、元数据、全局 token
src/components/          顶栏、地图、目录、入口、纠错弹层
src/features/map/        客户端状态、选择器、投影锚点、API
src/features/nearby/     刷新用例、Supabase 仓储、商场分组
src/features/location/   浏览器定位
src/features/place-search/ 地点检索
src/lib/                 amap / geo / supabase / http / env
```

更细的依赖方向、关键接口和地图说明见 [架构说明](docs/architecture.md)。

## 地图与坐标

- 附近范围固定为 500 米；高德抓取半径 900 米，留出网格边缘余量。
- 门店以 WGS84 存储；调用高德时转换为 GCJ-02。
- 默认底图是 CARTO Positron（OSM 数据、WGS84、无需 key）；`NEXT_PUBLIC_MAP_STYLE_URL` 可覆盖。样式错误或 9 秒未加载时自动切换 OpenFreeMap Positron，两边都失败才显示带注册网格的“示意视图”。
- 标记位置由 `src/lib/geo/viewport.ts` 按 Web Mercator 投影，并跟随地图的实时中心与缩放；不再使用与底图无关的百分比布局。
- 地图只允许平移和缩放，禁用旋转/倾斜；首次进入按门店自动拟合，用户移动后可一键回到门店范围。
- 如果自建样式使用 GCJ-02，标记会与 WGS84 门店偏移，不建议混用。
- MapLibre worker 由 `scripts/copy-maplibre-worker.mjs` 在安装、开发和构建时复制到 `public/maplibre/`，不要提交该产物。

## 冷启动与缓存

- 饮料和商场两组高德请求并行；饮料最多取 2 页，商场和地点搜索取 1 页；单请求 3 秒超时，单组失败不拖垮整次搜索。
- 商场只按搜索点周围 1400 米包围盒查询，不再扫全表。`202611080001_mall_gcj02_index.sql` 为这个查询建索引；未应用也能工作，但会回退到扫描。
- 抽屉改为 `transform` bottom sheet，展开/收起不再改变地图高度；收起态列表有底部补偿，最后一排可滚到可见区。
- 服务端会打印 `nearby_refresh` 日志，只包含耗时、缓存状态和门店数，不含坐标或密钥。

## 验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

配置本地密钥并启动网站后，可运行 `npm run validate:shanghai`。该命令会冷、热各查一次 12 个上海代表点，只输出区域、地点名、耗时和聚类统计，不输出坐标。人工补齐验收基线前，命令会明确返回发布阻塞。
