# 奶茶地图（NaichaMap）

一个面向上海的移动端附近饮品店地图。它会优先展示用户当前商场内的奶茶、饮品和咖啡店；无法可靠判断商场时，则展示一公里内门店，并按商场聚类。

## V1 范围

- 上海范围内按需查询门店
- 奶茶、现制饮品和咖啡分类
- MapCN / MapLibre 地图与上滑门店菜单
- 高德查询结果规范化后缓存到 Supabase，缓存有效期 30 天
- 无需登录的纠错提交，同一 IP 每 5 分钟最多一次
- 复制品牌名后前往微信搜索

V1 不包含导航、楼层信息、小程序直达、用户账号或独立管理后台。

## 当前状态

V1 已完成本地实现：定位或手动搜索地点后，页面会展示 1 公里内门店；商场判断可信时优先显示当前商场，否则保留已确认的商场分组并展示周边街铺。

## 技术栈

- Vercel
- React + TypeScript
- Tailwind CSS + shadcn/ui
- MapCN / MapLibre
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

## 验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

配置本地密钥并启动网站后，可运行 `npm run validate:shanghai`。该命令会冷、热各查一次 12 个上海代表点，只输出区域、地点名、耗时和聚类统计，不输出坐标。人工补齐验收基线前，命令会明确返回发布阻塞。
