# 宝宝尺码日历（独立部署）

从主仓库拆出的 **Next.js 14** 应用，仅包含 `/baby-size-calendar` 相关页面与计算逻辑，适合单独部署到 Vercel / 自有服务器。

## 功能

- 按城市气候与 WHO 儿童身高参考，生成 6–9 个月尺码日历与夏/秋/冬囤衣建议。
- 结果页支持导出 **Markdown**、**HTML**（可打印为 PDF）。
- 购买码段按「穿着月数」合并：单月过渡码（如 59、73）并入更大档，减少重复囤货。

## 本地运行

```bash
npm install
npm run dev
```

默认 [http://localhost:3000](http://localhost:3000) 会进入尺码日历（子项目根路由重定向到 `/baby-size-calendar`）。

```bash
npm run build
npm start
```

## 与主仓库的关系

- 核心逻辑在 `src/lib/baby-size-calculator.ts`，应与主项目 `../src/lib/baby-size-calculator.ts` 保持同步。
- 修改算法时建议两处一起改，或在主项目改完后复制到本子目录。

## 环境变量

**无需**数据库或第三方 API 即可运行全部尺码计算。

若将来接入统计等可选服务，可在本子目录自行添加 `.env.local`。

## 静态资源

公众号横幅等图片放在 `public/baby-size-calendar/`（若主项目有同步复制到此处）。

## 部署提示

- 构建命令：`npm run build`
- 输出：Next.js 标准
- 无 Supabase / 无服务端持久化；全部为前端计算与浏览器下载导出
