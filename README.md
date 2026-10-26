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

V1 设计已确认，等待按任务实施。参见 [V1 设计文档](docs/superpowers/specs/2026-10-26-naicha-map-design.md) 与 [实施计划](docs/superpowers/plans/2026-10-26-naicha-map-v1.md)。

## 计划技术栈

- Vercel
- React + TypeScript
- Tailwind CSS + shadcn/ui
- MapCN / MapLibre
- Supabase PostgreSQL + PostGIS
- 高德 Web Service API（已取得适用本项目的邮件许可）

## 安全说明

高德与 Supabase 的服务端密钥不得提交到仓库。授权邮件及附件也不进入仓库。
