#!/usr/bin/env node
/** 将 public 下公众号图内嵌为 TS 常量，避免微信内 fetch 失败导致导出无二维码 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pngPath = path.join(root, "public/baby-size-calendar/wechat-cc-banner.png");
const outPath = path.join(root, "src/lib/wechat-banner-data-url.ts");

const buf = fs.readFileSync(pngPath);
const b64 = buf.toString("base64");
const out = `/** 由 scripts/embed-wechat-banner.mjs 生成，源文件 public/baby-size-calendar/wechat-cc-banner.png */
export const WECHAT_BANNER_DATA_URL =
  "data:image/png;base64,${b64}" as const;
`;

fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${buf.length} bytes png -> ${b64.length} chars base64)`);
