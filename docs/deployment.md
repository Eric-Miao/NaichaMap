# NaichaMap 部署说明

## 1. 密钥与环境变量

本地复制 `.env.example` 为 `.env.local`，Vercel 则在项目的 Environment Variables 中配置同名变量：

- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_SECRET_KEY`：仅服务端使用的 Secret Key。
- `AMAP_WEB_SERVICE_KEY`：已获许可的高德 Web Service Key。
- `IP_HASH_SALT`：至少 32 个随机字符，用于不可逆哈希提交者 IP。
- `NEXT_PUBLIC_MAP_STYLE_URL`：可选的 MapCN/MapLibre 样式 URL；不填时使用内置低依赖底图。

`SUPABASE_SECRET_KEY`、数据库密码、`AMAP_WEB_SERVICE_KEY` 和 `IP_HASH_SALT` 必须由维护者直接填入本地或 Vercel 的秘密存储，不能发到聊天、截图、日志或提交到 Git。曾在聊天或其他非秘密渠道出现过的数据库密码应立即在 Supabase 中轮换，再更新本地与 Vercel。

## 2. Supabase 初始化

推荐使用已绑定项目的 Supabase MCP 应用 `supabase/migrations` 下两份迁移；也可以安装 Supabase CLI 后执行：

```bash
npx supabase link --project-ref cviyfbudarsxxyvjsioc
npx supabase db push
```

验证 PostGIS、表、RPC 与 RLS：

```bash
npx supabase db reset
npx supabase test db
```

线上应满足：PostGIS 已启用；五张业务表启用 RLS 且没有浏览器直连策略；服务端 Secret Key 才能访问；数据库 pgTAP 共 37 项通过。若本机未启动 Docker Desktop，使用 Native Supabase MCP 在远端事务中运行同一测试文件。

## 3. 本地与预览环境

```bash
npm install
cp .env.example .env.local
npm run dev
```

提交前运行完整闸门：

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

端到端测试默认使用本机 Google Chrome 的 Pixel 7 尺寸。CI 若不带系统 Chrome，可安装 Playwright Chromium 并在 `playwright.config.ts` 中去掉 `channel: "chrome"`。

## 4. Vercel 发布

1. 在 Vercel 导入公开 GitHub 仓库 `Eric-Miao/NaichaMap`。
2. Framework Preset 选择 Next.js，Build Command 保持 `npm run build`。
3. 在 Preview 和 Production 分别填入第 1 节的环境变量；不要把 Secret Key 暴露成 `NEXT_PUBLIC_*`。
4. 先发布 Preview，完成 iOS Safari 和 Android Chrome 的定位许可、上滑抽屉、地图点选、地点搜索与纠错限流冒烟测试。
5. 检查 Vercel Function Logs：不得出现请求体、经纬度、原始 IP 或任何密钥，然后再提升到 Production。

V1 的 Supabase 客户端只存在于 Vercel 服务端路由，浏览器包不包含 Supabase Publishable Key 或 Secret Key。

## 5. 上海 12 点验收

启动带真实密钥的本地或 Preview 服务，然后执行：

```bash
NAICHA_MAP_BASE_URL=http://localhost:3000 npm run validate:shanghai
```

数据覆盖浦东、黄浦、静安、徐汇、长宁、闵行、宝山、杨浦、嘉定、青浦、松江和奉贤。脚本对每点执行冷、热两次查询并输出耗时、模式、商场分组数和门店数；不会把输入坐标写进输出或应用日志。

发布标准：

- 人工复核品牌召回率不低于 90%；
- 餐厅误报率低于 5%；
- 已知商场归属全部正确；
- 无法可靠判断的地点安全降级为“附近”。

首次运行前，由人工核对高德结果，把每点应出现的品牌和误入的餐厅分别填入 `tests/acceptance/shanghai-points.json` 的 `reviewedExpectedBrands`、`reviewedRestaurantNames`，然后把 `reviewComplete` 改成 `true`。未完成时脚本会故意返回失败，避免未经人工验收的结果被当成发布通过。

## 6. 缓存刷新、轮换与回滚

30 天缓存到期后自动刷新。需要提前刷新某一范围时，只把对应 `search_areas.expires_at` 改为过去时间；不要删除 `stores` 或关联记录。

密钥轮换顺序：先创建或重置新密钥，在 Preview 验证，再更新 Production，最后撤销旧密钥。数据库密码轮换后同步更新所有连接池和本地秘密存储。

回滚应用时，在 Vercel Deployments 中把上一个已验证部署 Promote 到 Production。数据库迁移是向前兼容设计；不要在事故中直接删除表或回滚数据。若新迁移有问题，先回滚应用，再提交一份可审计的修复迁移。
