import type {
  Gender,
  PercentileBand,
  SeasonAdviceDetail,
  SizeAdvice,
} from "@/lib/baby-size-calculator";
import { percentileBandTitle } from "@/lib/percentile-band-labels";
import {
  purchaseListHeading,
  shouldShowSummerSeasonCard,
} from "@/lib/shopping-season-focus";

export type BabySizeResultExportBundle = {
  advice: SizeAdvice;
  meta: {
    birth: string;
    gender: Gender;
    percentileBand: PercentileBand;
    heightCm: number | null;
    weightKg: number | null;
  };
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function seasonToMarkdown(title: string, s: SeasonAdviceDetail): string {
  const lines: string[] = [`## ${title}`, "", s.summary, ""];
  if (s.garments.length === 0) {
    lines.push("_（本季无建议品类）_", "");
    return lines.join("\n");
  }
  lines.push("| 品类 | 建议码 | 必备件数 | 说明 |");
  lines.push("| --- | --- | --- | --- |");
  for (const g of s.garments) {
    lines.push(
      `| ${g.category} | ${g.size} | ${g.quantity} | ${(g.tip ?? "—").replace(/\|/g, "\\|")} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/** 纯文本 / Markdown，便于存档或发给家人 */
export function exportBabySizeAdviceToMarkdown(bundle: BabySizeResultExportBundle): string {
  const { advice, meta } = bundle;
  const gl = meta.gender === "girl" ? "女宝" : "男宝";
  const whoLine = meta.heightCm
    ? `身高 ${meta.heightCm} cm（已填）`
    : `身高未填 · ${percentileBandTitle(meta.percentileBand)}`;
  const wLine = meta.weightKg ? ` · 体重 ${meta.weightKg} kg` : "";

  const parts: string[] = [
    "# 宝宝尺码日历 · 囤衣建议",
    "",
    `> 导出时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "",
    "## 基本信息",
    "",
    `- **地区**：${advice.localityLabel}`,
    `- **宝宝**：${gl} · 生日 ${meta.birth} · ${whoLine}${wLine}`,
    `- **气候**：${advice.climateLabel}`,
    "",
  ];

  if (advice.nearestPercentileBand) {
    parts.push(
      `按当前身高，更接近 **${percentileBandTitle(advice.nearestPercentileBand)}** 这一档。`,
      "",
    );
  }

  parts.push(
    "## 当前主力尺码",
    "",
    `**${advice.currentMainSize} 码**（约 ${advice.ageMonths} 个月龄）`,
    "",
    ...(shouldShowSummerSeasonCard(advice.purchaseListFocus)
      ? [seasonToMarkdown("夏装建议", advice.summer)]
      : []),
    seasonToMarkdown("秋装建议", advice.fall),
    seasonToMarkdown("冬装建议", advice.winter),
    "## 不建议囤的品类",
    "",
    ...advice.avoidStockpile.map((x) => `- ${x}`),
    "",
    "## 未来 6–9 个月尺码日历",
    "",
    "| 月份 | 月龄 | 参考身高 | 参考码 |",
    "| --- | --- | --- | --- |",
  );

  for (const row of advice.calendar) {
    parts.push(
      `| ${row.label} | ${row.ageMonths} 月 | 约 ${row.heightCm} cm | ${row.size} 码 |`,
    );
  }
  parts.push("");

  if (advice.shoppingFocusNote) {
    parts.push(advice.shoppingFocusNote, "");
  }
  parts.push(
    advice.purchaseListFocus === "summer_618"
      ? "## 618 夏装购买清单"
      : "## 购买清单汇总",
    "",
  );
  if (advice.purchaseList.length === 0) {
    parts.push("_（当前无汇总行）_", "");
  } else {
    parts.push("| 款式 | 号码 | 使用时长 | 件数 |");
    parts.push("| --- | --- | --- | --- |");
    for (const r of advice.purchaseList) {
      const wp = r.wearPeriod.replace(/\|/g, "\\|").replace(/\n/g, " ");
      parts.push(`| ${r.style} | ${r.size} | ${wp} | ${r.quantity} |`);
    }
    parts.push("");
  }

  parts.push("---", "", advice.disclaimer, "");
  return parts.join("\n");
}

function seasonToHtml(title: string, s: SeasonAdviceDetail): string {
  let body = `<h2>${escHtml(title)}</h2><p>${escHtml(s.summary)}</p>`;
  if (s.garments.length === 0) {
    body += "<p><em>本季无建议品类</em></p>";
    return body;
  }
  body +=
    "<table><thead><tr><th>品类</th><th>建议码</th><th>必备件数</th><th>说明</th></tr></thead><tbody>";
  for (const g of s.garments) {
    body += `<tr><td>${escHtml(g.category)}</td><td>${escHtml(g.size)}</td><td>${escHtml(g.quantity)}</td><td>${escHtml(g.tip ?? "—")}</td></tr>`;
  }
  body += "</tbody></table>";
  return body;
}

/** 单文件 HTML，可在浏览器打开后用「打印 → 存为 PDF」代替长截图 */
export function exportBabySizeAdviceToHtml(bundle: BabySizeResultExportBundle): string {
  const { advice, meta } = bundle;
  const gl = meta.gender === "girl" ? "女宝" : "男宝";
  const md = exportBabySizeAdviceToMarkdown(bundle);

  const calendarRows = advice.calendar
    .map(
      (row) =>
        `<tr><td>${escHtml(row.label)}</td><td>${row.ageMonths} 月</td><td>约 ${row.heightCm} cm</td><td><strong>${row.size}</strong> 码</td></tr>`,
    )
    .join("");

  const purchaseRows =
    advice.purchaseList.length === 0
      ? "<p><em>当前无汇总行</em></p>"
      : `<table><thead><tr><th>款式</th><th>号码</th><th>使用时长</th><th>件数</th></tr></thead><tbody>${advice.purchaseList
          .map(
            (r) =>
              `<tr><td>${escHtml(r.style)}</td><td>${escHtml(r.size)}</td><td>${escHtml(r.wearPeriod)}</td><td>${escHtml(r.quantity)}</td></tr>`,
          )
          .join("")}</tbody></table>`;

  const avoid = advice.avoidStockpile.map((x) => `<li>${escHtml(x)}</li>`).join("");

  const nearest = advice.nearestPercentileBand
    ? `<p>按当前身高，更接近 <strong>${percentileBandTitle(advice.nearestPercentileBand)}</strong> 这一档。</p>`
    : "";

  const style = `body{font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1c1917;max-width:48rem;margin:0 auto;padding:1.5rem;}
h1{font-size:1.35rem;margin-bottom:0.5rem;}
h2{font-size:1.05rem;margin-top:1.75rem;color:#c2410c;}
table{width:100%;border-collapse:collapse;font-size:0.85rem;margin:0.75rem 0;}
th,td{border:1px solid #e7e5e4;padding:0.4rem 0.5rem;text-align:left;vertical-align:top;}
th{background:#fafaf9;}
.muted{color:#78716c;font-size:0.85rem;}
pre{white-space:pre-wrap;background:#fafaf9;padding:1rem;border-radius:0.5rem;font-size:0.75rem;border:1px solid #e7e5e4;}
@media print{body{padding:0;}h2{page-break-after:avoid;}table{page-break-inside:avoid;}}`;

  return `<!DOCTYPE html><html lang="zh-Hans"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>宝宝尺码建议 ${escHtml(meta.birth)}</title><style>${style}</style></head><body>
<h1>宝宝尺码日历 · 囤衣建议</h1>
<p class="muted">导出时间：${escHtml(new Date().toLocaleString("zh-CN", { hour12: false }))}</p>
<p><strong>${escHtml(advice.localityLabel)}</strong> · ${gl} · 生日 ${escHtml(meta.birth)} · ${escHtml(percentileBandTitle(meta.percentileBand))}${meta.heightCm ? ` · 身高 ${meta.heightCm} cm` : ""}${meta.weightKg ? ` · 体重 ${meta.weightKg} kg` : ""}</p>
<p class="muted">${escHtml(advice.climateLabel)}</p>
${nearest}
<h2>当前主力尺码</h2>
<p style="font-size:1.75rem;font-weight:700;">${advice.currentMainSize} 码 <span class="muted" style="font-size:1rem;">（约 ${advice.ageMonths} 个月龄）</span></p>
${shouldShowSummerSeasonCard(advice.purchaseListFocus) ? seasonToHtml("夏装建议", advice.summer) : ""}
${seasonToHtml("秋装建议", advice.fall)}
${seasonToHtml("冬装建议", advice.winter)}
<h2>不建议囤的品类</h2>
<ul>${avoid}</ul>
<h2>未来 6–9 个月尺码日历</h2>
<table><thead><tr><th>月份</th><th>月龄</th><th>参考身高</th><th>参考码</th></tr></thead><tbody>${calendarRows}</tbody></table>
${advice.shoppingFocusNote ? `<p>${escHtml(advice.shoppingFocusNote)}</p>` : ""}
<h2>${escHtml(purchaseListHeading(advice.purchaseListFocus))}</h2>
${purchaseRows}
<hr/>
<p class="muted">${escHtml(advice.disclaimer)}</p>
<details style="margin-top:2rem;"><summary style="cursor:pointer;color:#78716c;">Markdown 原文（备用）</summary>
<pre>${escHtml(md)}</pre>
</details>
</body></html>`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
