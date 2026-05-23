"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BabySizeResultExportBundle } from "@/lib/baby-size-export";
import type { SeasonAdviceDetail } from "@/lib/baby-size-calculator";
import { ClothingIconStrip } from "@/components/baby-size-calendar/ClothingIconStrip";
import {
  applyWechatBannerForPosterExport,
  getPosterBannerDataUrl,
  posterExportPixelRatio,
  POSTER_BANNER_IMG_SELECTOR,
  WECHAT_BANNER_PATH,
} from "@/lib/poster-assets";
import { savePosterBlob } from "@/lib/mobile-export";
import {
  purchaseListHeading,
  shouldShowSummerSeasonCard,
} from "@/lib/shopping-season-focus";

type Props = {
  bundle: BabySizeResultExportBundle;
  /** 供底部固定栏等外部触发同一次下载 */
  onDownloadReady?: (download: () => Promise<void>) => void;
  onBusyChange?: (busy: boolean) => void;
  showInlineButton?: boolean;
  buttonLabel?: string;
};

export function BabySizeSharePoster({
  bundle,
  onDownloadReady,
  onBusyChange,
  showInlineButton = true,
  buttonLabel = "保存清单长图",
}: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bannerBroken, setBannerBroken] = useState(false);

  const { advice, meta } = bundle;
  const gl = meta.gender === "girl" ? "女宝" : "男宝";
  const heights = advice.calendar.map((r) => r.heightCm);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  const span = Math.max(maxH - minH, 1);
  /** 海报内容区 750-80；图表卡片再减左右 padding 16×2 */
  const innerChartW = 638;
  const chartSvgH = 168;
  const padL = 40;
  const padR = 12;
  const padT = 26;
  const padB = 12;
  const xInset = 22;
  const plotW = innerChartW - padL - padR;
  const plotH = chartSvgH - padT - padB;
  const nMonths = advice.calendar.length;
  const midH = Math.round(minH + span / 2);
  const yAxisTicks =
    minH === maxH ? [minH] : midH === minH || midH === maxH ? [minH, maxH] : [minH, midH, maxH];

  function monthShort(label: string): string {
    return label.replace(/^\d{4}年/, "");
  }

  function pointXY(i: number, heightCm: number) {
    const usableW = Math.max(plotW - xInset * 2, 1);
    const x = padL + xInset + (i / Math.max(nMonths - 1, 1)) * usableW;
    const y = padT + plotH - ((heightCm - minH) / span) * plotH;
    return { x, y };
  }

  const downloadPoster = useCallback(async () => {
    const el = posterRef.current;
    if (!el) return;
    setBusy(true);
    setErr(null);
    setSuccess(null);
    try {
      const qrImg = el.querySelector<HTMLImageElement>(POSTER_BANNER_IMG_SELECTOR);
      if (qrImg) {
        await applyWechatBannerForPosterExport(qrImg);
      }
      await new Promise<void>((r) => {
        requestAnimationFrame(() => requestAnimationFrame(() => r()));
      });

      const { toBlob } = await import("html-to-image");
      const pixelRatio = posterExportPixelRatio(el.scrollHeight);
      const blob = await toBlob(el, {
        pixelRatio,
        cacheBust: false,
        backgroundColor: "#fff7f2",
        width: 750,
        type: "image/png",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      if (!blob) throw new Error("empty image");

      const filename = `宝宝囤衣清单-${meta.birth}.png`;
      const mode = await savePosterBlob(blob, filename);
      setSuccess(
        mode === "preview"
          ? "已打开图片预览。长按图片 → 保存到相册（再次生成可重复操作）。"
          : "图片已开始下载，请在相册或「文件」中查看。",
      );
    } catch {
      setErr("生成或下载失败，请稍等几秒后重试一次。");
    } finally {
      setBusy(false);
    }
  }, [meta.birth]);

  useEffect(() => {
    onDownloadReady?.(downloadPoster);
  }, [onDownloadReady, downloadPoster]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  return (
    <div className={showInlineButton ? "mt-3" : ""}>
      {showInlineButton ? (
      <button
        type="button"
        disabled={busy}
        onClick={downloadPoster}
        className="min-h-12 w-full rounded-xl bg-orange-500 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-orange-900/15 hover:bg-orange-600 disabled:opacity-60"
      >
        {busy ? "正在生成图片…" : buttonLabel}
      </button>
      ) : null}
      {success ? (
        <p
          className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900"
          role="status"
        >
          {success}
        </p>
      ) : null}
      {err ? (
        <p
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
          role="alert"
        >
          {err}
        </p>
      ) : null}
      {!success && !err ? (
        <p className="mt-2 text-pretty text-xs text-stone-500">
          点击后直接下载 PNG 长图，可保存到相册或转发微信好友。
        </p>
      ) : null}


      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10"
        style={{
          width: 750,
          opacity: 0.01,
          overflow: "visible",
        }}
      >
        <div
          ref={posterRef}
          style={{
            width: 750,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif',
            background: "linear-gradient(180deg, #fff7f2 0%, #ffffff 42%)",
            color: "#1c1917",
            padding: 40,
            boxSizing: "border-box",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "#ea580c", fontWeight: 700 }}>
            AI计算器
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800, lineHeight: 1.25 }}>
            618囤衣清单
          </h1>
          <ClothingIconStrip variant="poster" />
          <p style={{ margin: "12px 0 0", fontSize: 15, color: "#57534e", lineHeight: 1.5 }}>
            {gl} · {advice.localityLabel} · 生日 {meta.birth}
            {meta.heightCm ? ` · ${meta.heightCm} cm` : ""}
            {meta.weightKg ? ` · ${meta.weightKg} kg` : ""}
          </p>

          <div
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 16,
              background: "#fff",
              border: "2px solid #fed7aa",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#ea580c", fontWeight: 700 }}>
              当前主力码
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 48, fontWeight: 800, color: "#1c1917" }}>
              {advice.currentMainSize}
              <span style={{ fontSize: 22, color: "#78716c", fontWeight: 600 }}> 码</span>
            </p>
          </div>

          {advice.newbornParentTips.length > 0 ? (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                fontSize: 12,
                lineHeight: 1.55,
                color: "#44403c",
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0369a1" }}>
                新生儿囤衣避坑
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {advice.newbornParentTips.map((line) => (
                  <li key={line} style={{ marginBottom: 6 }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              background: "#fffbeb",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#44403c",
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#c2410c" }}>
              南北穿衣提示
            </p>
            <p style={{ margin: 0 }}>{advice.regionalLivingHint}</p>
            <p style={{ margin: "10px 0 0", fontSize: 11, lineHeight: 1.5, color: "#78716c" }}>
              {advice.climateZoneExplanation}
            </p>
          </div>

          {advice.purchaseList.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>
                {purchaseListHeading(advice.purchaseListFocus)}
              </p>
              {advice.shoppingFocusNote ? (
                <p style={{ margin: "0 0 8px", fontSize: 10, lineHeight: 1.45, color: "#9a3412" }}>
                  {advice.shoppingFocusNote}
                </p>
              ) : null}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ background: "#fafaf9" }}>
                    {["款式", "号码", "使用时长", "件数"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 4px",
                          textAlign: "left",
                          color: "#78716c",
                          fontWeight: 600,
                          verticalAlign: "top",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {advice.purchaseList.map((row, i) => (
                    <tr key={`${row.style}-${row.size}-${i}`} style={{ borderTop: "1px solid #f5f5f4" }}>
                      <td style={{ padding: "5px 4px", fontWeight: 600 }}>{row.style}</td>
                      <td style={{ padding: "5px 4px", color: "#c2410c", whiteSpace: "nowrap" }}>
                        {row.size}
                      </td>
                      <td style={{ padding: "5px 4px", lineHeight: 1.4, color: "#57534e" }}>
                        {row.wearPeriod}
                      </td>
                      <td style={{ padding: "5px 4px", whiteSpace: "nowrap" }}>{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {advice.avoidStockpile.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>
                不建议囤的品类
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "#44403c",
                }}
              >
                {advice.avoidStockpile.map((line) => (
                  <li key={line} style={{ marginBottom: 4 }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #fed7aa",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ea580c" }}>
              未来身高趋势（WHO 参考）
            </p>
            <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#57534e" }}>
              预测约 <strong style={{ color: "#1c1917" }}>{minH}–{maxH} cm</strong>
              ，共 {advice.calendar.length} 个月 · 各点数字为参考身高
            </p>
            <div style={{ width: "100%", overflow: "hidden" }}>
              <svg
                width="100%"
                height={chartSvgH}
                viewBox={`0 0 ${innerChartW} ${chartSvgH}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", maxWidth: "100%" }}
              >
                {yAxisTicks.map((tick) => {
                  const y = padT + plotH - ((tick - minH) / span) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={padL + plotW}
                        y2={y}
                        stroke="#f5f5f4"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padL - 5}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={12}
                        fill="#57534e"
                        fontWeight={600}
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}
                {advice.calendar.map((row, i) => {
                  if (i === 0) return null;
                  const prev = advice.calendar[i - 1]!;
                  const p0 = pointXY(i - 1, prev.heightCm);
                  const p1 = pointXY(i, row.heightCm);
                  return (
                    <line
                      key={`line-${row.monthKey}`}
                      x1={p0.x}
                      y1={p0.y}
                      x2={p1.x}
                      y2={p1.y}
                      stroke="#fdba74"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                    />
                  );
                })}
                {advice.calendar.map((row, i) => {
                  const { x, y } = pointXY(i, row.heightCm);
                  const valueY = y > padT + 18 ? y - 8 : y + 14;
                  return (
                    <g key={row.monthKey}>
                      <circle cx={x} cy={y} r={6} fill="#fff" stroke="#ea580c" strokeWidth={2.5} />
                      <text
                        x={x}
                        y={valueY}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={700}
                        fill="#c2410c"
                      >
                        {row.heightCm}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${nMonths}, minmax(0, 1fr))`,
                  gap: 2,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {advice.calendar.map((row) => (
                  <div key={row.monthKey} style={{ minWidth: 0, lineHeight: 1.35 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#c2410c",
                      }}
                    >
                      {row.heightCm} cm
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#57534e", fontWeight: 600 }}>
                      {monthShort(row.label)}
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: 10, color: "#78716c" }}>
                      {row.ageMonths}月·{row.size}码
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {shouldShowSummerSeasonCard(advice.purchaseListFocus) ? (
            <PosterSeasonBlock title="夏装建议" advice={advice.summer} />
          ) : null}
          <PosterSeasonBlock title="秋装建议" advice={advice.fall} />
          <PosterSeasonBlock title="冬装建议" advice={advice.winter} />

          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>
              尺码日历
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#fafaf9" }}>
                  {["月份", "月龄", "身高", "码"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 6px",
                        textAlign: "left",
                        color: "#78716c",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advice.calendar.map((row) => (
                  <tr key={row.monthKey} style={{ borderTop: "1px solid #f5f5f4" }}>
                    <td style={{ padding: "6px" }}>{row.label}</td>
                    <td style={{ padding: "6px" }}>{row.ageMonths} 月</td>
                    <td style={{ padding: "6px" }}>约 {row.heightCm} cm</td>
                    <td style={{ padding: "6px", fontWeight: 700, color: "#c2410c" }}>
                      {row.size}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 12,
              background: "#fafaf9",
              fontSize: 11,
              lineHeight: 1.5,
              color: "#57534e",
            }}
          >
            {advice.brandSizingNote}
          </div>

          <p
            style={{
              marginTop: 14,
              fontSize: 10,
              lineHeight: 1.45,
              color: "#a8a29e",
            }}
          >
            {advice.disclaimer}
          </p>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px dashed #fed7aa",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>公众号：CC的数据线</p>
            <p style={{ margin: "6px 0 12px", fontSize: 12, color: "#78716c" }}>
              微信搜一搜 · 换季囤衣与养娃数据
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-poster-banner=""
              src={getPosterBannerDataUrl()}
              alt="微信搜一搜：CC的数据线"
              width={1024}
              height={373}
              loading="eager"
              decoding="async"
              onError={() => setBannerBroken(true)}
              style={{ width: "88%", height: "auto", borderRadius: 12 }}
            />
            {bannerBroken ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
                公众号图加载失败，请检查网络后刷新；导出长图也可能缺少二维码。
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PosterSeasonBlock({ title, advice }: { title: string; advice: SeasonAdviceDetail }) {
  if (advice.garments.length === 0 && !advice.summary) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#ea580c" }}>{title}</p>
      <p style={{ margin: "0 0 8px", fontSize: 11, lineHeight: 1.45, color: "#44403c" }}>
        {advice.summary}
      </p>
      {advice.garments.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: "#fafaf9" }}>
              {["品类", "码", "件数", "说明"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 4px",
                    textAlign: "left",
                    color: "#78716c",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {advice.garments.map((g) => (
              <tr key={g.category} style={{ borderTop: "1px solid #f5f5f4" }}>
                <td style={{ padding: "5px 4px", fontWeight: 600 }}>{g.category}</td>
                <td style={{ padding: "5px 4px", color: "#c2410c", whiteSpace: "nowrap" }}>{g.size}</td>
                <td style={{ padding: "5px 4px", whiteSpace: "nowrap" }}>{g.quantity}</td>
                <td style={{ padding: "5px 4px", lineHeight: 1.35, color: "#57534e" }}>
                  {g.tip ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
