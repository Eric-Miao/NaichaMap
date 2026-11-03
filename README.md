# 奶茶地图（NaichaMap）

一个面向上海的移动端附近饮品店地图。它会优先展示用户当前商场内的奶茶、饮品和咖啡店；无法可靠判断商场时，则展示一公里内门店，并按商场聚类。

## V1 范围

- 上海范围内按需查询门店
- 奶茶、现制饮品和咖啡分类
- MapLibre + OSM 底图（CARTO Positron，失败切 OpenFreeMap） 地图与上滑门店菜单
- 高德查询结果规范化后缓存到 Supabase，缓存有效期 30 天
- 无需登录的纠错提交，同一 IP 每 5 分钟最多一次
- 复制品牌名后前往微信搜索

V1 不包含导航、楼层信息、小程序直达、用户账号或独立管理后台。

## 当前状态

V1 已完成本地实现：定位或手动搜索地点后，页面会展示 500 米内门店；商场判断可信时优先显示当前商场，否则保留已确认的商场分组并展示周边街铺。

## 交互与视觉

界面像一张奶茶店柜台上的纸质索引：奶油纸面、深焙茶墨文字、1px 分隔线、两位数字索引，唯一强调色是茶青。地图标记与目录行共用同一组编号；默认抽屉占 60% 屏高，首屏同时看到地图、当前商场和它的前三家店。

完整的颜色、字体、组件和状态规则见 [DESIGN.md](DESIGN.md)。

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
- 标记位置由 `src/lib/geo/viewport.ts` 按 Web Mercator 拟合后投影，和 MapLibre 底图保持一致；不再使用与底图无关的百分比布局。
- 如果自建样式使用 GCJ-02，标记会与 WGS84 门店偏移，不建议混用。
- MapLibre worker 由 `scripts/copy-maplibre-worker.mjs` 在安装、开发和构建时复制到 `public/maplibre/`，不要提交该产物。

## 验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

配置本地密钥并启动网站后，可运行 `npm run validate:shanghai`。该命令会冷、热各查一次 12 个上海代表点，只输出区域、地点名、耗时和聚类统计，不输出坐标。人工补齐验收基线前，命令会明确返回发布阻塞。
