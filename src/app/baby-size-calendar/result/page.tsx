import Link from "next/link";
import { redirect } from "next/navigation";
import {
  computeBabySizeAdvice,
  parseHeightCmInput,
  type BabyInput,
  type SeasonAdviceDetail,
} from "@/lib/baby-size-calculator";
import { checkBabyAgeSupported } from "@/lib/baby-size-age-limits";
import { OverAgeFriendlyNotice } from "@/components/baby-size-calendar/OverAgeFriendlyNotice";
import { ClothingIconStrip } from "@/components/baby-size-calendar/ClothingIconStrip";
import { BabySizeResultActions } from "@/components/baby-size-calendar/BabySizeResultActions";
import { BabySizePosterExportZone } from "@/components/baby-size-calendar/BabySizePosterExportZone";
import { ResultPageShell } from "@/components/baby-size-calendar/ResultPageShell";
import { APP_BUILD_TAG } from "@/lib/app-build-tag";
import {
  fallWinterSeasonSectionHint,
  purchaseListHeading,
  shouldShowSummerSeasonCard,
} from "@/lib/shopping-season-focus";
import { parseHeightTrustParam } from "@/lib/baby-size-measured-height";
import { formatBirthDisplay } from "@/lib/birth-date-parts";
import { percentileBandTitle } from "@/lib/percentile-band-labels";
import { parseGenderParam, parsePercentileParam } from "@/lib/who-height-reference";
import { resolveLocalitySelection } from "@/lib/china-locality-options";

type Search = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function BabySizeCalendarResultPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const birth = first(searchParams.birth);
  const pc = first(searchParams.pc);
  const muni = first(searchParams.muni);
  const legacyCity = first(searchParams.city);
  const gender = parseGenderParam(first(searchParams.gender));
  const percentileBand = parsePercentileParam(first(searchParams.p));
  const heightRaw = first(searchParams.height);
  const weightRaw = first(searchParams.weight);
  const heightProjectionMode = parseHeightTrustParam(first(searchParams.heightTrust));

  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    redirect("/baby-size-calendar?hint=missing-birth");
  }

  const ageCheck = checkBabyAgeSupported(birth);
  if (!ageCheck.ok) {
    return <OverAgeFriendlyNotice message={ageCheck.message} />;
  }

  const { provinceCode, municipality } = resolveLocalitySelection(pc, muni, legacyCity);
  const heightCm = parseHeightCmInput(birth, gender, heightRaw, new Date(), {
    trustMeasured: heightProjectionMode === "measured_anchor",
  });
  const heightDisplayRaw =
    heightRaw && !Number.isNaN(Number(heightRaw.replace(",", ".").trim()))
      ? Math.round(Number(heightRaw.replace(",", ".").trim()) * 10) / 10
      : heightCm;
  const weightKg =
    weightRaw && !Number.isNaN(Number(weightRaw))
      ? Math.min(40, Math.max(2, Number(weightRaw)))
      : null;

  const input: BabyInput = {
    birthDate: birth,
    provinceCode,
    municipality,
    gender,
    percentileBand,
    heightCm,
    weightKg,
    heightProjectionMode,
  };

  const advice = computeBabySizeAdvice(input);
  const birthLabel = formatBirthDisplay(birth);
  const genderLabel = gender === "girl" ? "女宝" : "男宝";
  const exportBundle = {
    advice,
    meta: {
      birth: birthLabel,
      gender,
      percentileBand,
      heightCm,
      weightKg,
    },
  };

  return (
    <ResultPageShell>
    <main className="mx-auto max-w-lg px-3 pb-[max(7.5rem,env(safe-area-inset-bottom,0px)+5rem)] pt-6 sm:px-4 sm:pb-28 sm:pt-12">
      <div className="mb-5 flex items-center justify-between gap-2 sm:mb-6 sm:gap-3">
        <Link
          href="/baby-size-calendar"
          className="min-h-11 min-w-0 shrink-0 rounded-lg py-2.5 text-sm font-medium text-stone-600 active:bg-stone-100 sm:py-0 sm:active:bg-transparent"
        >
          ← 重新填写
        </Link>
        <Link
          href="/baby-size-calendar/about"
          className="min-h-11 shrink-0 rounded-lg py-2.5 text-sm font-medium text-orange-700 underline-offset-4 hover:underline sm:py-0"
        >
          说明
        </Link>
      </div>

      <header className="mb-6 rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-sm sm:mb-8 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-orange-600">AI 计算器</p>
        <h1 className="mt-1 text-lg font-bold leading-snug text-stone-900 sm:text-xl">
          618 囤衣清单
        </h1>
        <ClothingIconStrip />
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600">
          <p className="text-pretty font-medium text-stone-800">{advice.localityLabel}</p>
          <p className="text-pretty">
            {genderLabel}
            {!heightCm ? ` · ${percentileBandTitle(percentileBand)}` : ""}
          </p>
          <p className="text-pretty">
            出生 {birthLabel}
            {heightDisplayRaw
              ? ` · 身高 ${heightDisplayRaw} cm${
                  heightProjectionMode === "who" &&
                  heightCm != null &&
                  heightCm !== heightDisplayRaw
                    ? `（已按 WHO 上限调整为 ${heightCm} cm）`
                    : ""
                }`
              : " · 身高未填"}
            {weightKg ? ` · 体重 ${weightKg} kg` : ""}
          </p>
        </div>
        <p className="mt-3 text-xs text-stone-500">{advice.climateLabel}</p>
        {advice.nearestPercentileBand ? (
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            按当前身高，更接近「
            <strong className="text-stone-800">
              {percentileBandTitle(advice.nearestPercentileBand)}
            </strong>
            」这一档。
          </p>
        ) : null}
        {advice.measuredHeightNotice ? (
          <p
            className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-950"
            role="status"
          >
            {advice.measuredHeightNotice}
          </p>
        ) : null}
        {advice.heightWeightWarning ? (
          <p
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"
            role="status"
          >
            {advice.heightWeightWarning}
          </p>
        ) : null}
      </header>

      <section className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          当前主力尺码
        </h2>
        <p className="mt-3 text-4xl font-bold tabular-nums text-stone-900 sm:text-5xl">
          {advice.currentMainSize}
          <span className="ml-1 text-lg font-semibold text-stone-500">码</span>
        </p>
        <p className="mt-2 text-sm text-stone-600">
          约 {advice.ageMonths} 个月龄；以下为按城市气候与 WHO 身高参考轨迹的尺码推荐。
        </p>
      </section>

      {advice.newbornParentTips.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-sky-900">新生儿囤衣避坑</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {advice.newbornParentTips.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-amber-900">南北穿衣提示</h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-stone-700">
          {advice.regionalLivingHint}
        </p>
        <p className="mt-3 text-pretty text-xs leading-relaxed text-stone-600">
          {advice.climateZoneExplanation}
        </p>
      </section>

      <section className="mb-8 rounded-2xl border-2 border-orange-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          {purchaseListHeading(advice.purchaseListFocus)}
        </h2>
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-stone-500 sm:text-sm">
          {advice.shoppingFocusNote ? (
            <p className="text-pretty rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2.5 text-orange-950">
              {advice.shoppingFocusNote}
            </p>
          ) : (
            <p className="text-pretty">
              合并夏/秋/冬可购品类，便于截图下单；来年夏装等已排除在清单外。
            </p>
          )}
          <p className="text-pretty">
            「使用时长」按日历里各尺码实际出现的自然月归纳；均码 / 配件仍显示整季区间。
          </p>
        </div>
        {advice.purchaseList.length > 0 ? (
          <>
            <ul className="mt-4 space-y-3 sm:hidden">
              {advice.purchaseList.map((row, i) => (
                <li
                  key={`m-${row.style}-${row.size}-${row.wearPeriod}-${i}`}
                  className="rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-3 text-sm"
                >
                  <p className="font-semibold leading-snug text-stone-900">{row.style}</p>
                  <div className="mt-2.5 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-2 text-[13px] leading-snug">
                    <span className="text-stone-500">号码</span>
                    <span className="font-medium text-orange-800">{row.size}</span>
                    <span className="text-stone-500">使用时长</span>
                    <span className="min-w-0 text-stone-600">
                      <PurchaseWearPeriod value={row.wearPeriod} />
                    </span>
                    <span className="text-stone-500">件数</span>
                    <span className="text-stone-800">{row.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="-mx-1 mt-0 hidden overflow-x-auto overscroll-x-contain rounded-xl border border-stone-100 px-1 touch-pan-x sm:mx-0 sm:mt-4 sm:block sm:px-0">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-xs font-medium text-stone-600">
                    <th className="px-3 py-2.5">款式</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">号码</th>
                    <th className="px-3 py-2.5 text-left">使用时长</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">件数</th>
                  </tr>
                </thead>
                <tbody>
                  {advice.purchaseList.map((row, i) => (
                    <tr
                      key={`${row.style}-${row.size}-${row.wearPeriod}-${i}`}
                      className="border-b border-stone-50 last:border-0"
                    >
                      <td className="px-3 py-2.5 font-medium text-stone-800">{row.style}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-orange-800">{row.size}</td>
                      <td className="max-w-[14rem] whitespace-normal px-3 py-2.5 align-top text-stone-600">
                        <PurchaseWearPeriod value={row.wearPeriod} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-stone-800">
                        {row.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-stone-600">
            当前暂无建议购买的品类；请查看下方分季说明与尺码日历。
          </p>
        )}
        <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-600">
          {advice.brandSizingNote}
        </p>
        <p className="mt-4 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-3 text-center text-sm font-medium text-orange-900">
          要转发家人？往下看「保存 / 转发清单长图」，或点屏幕底部橙色按钮。
        </p>
      </section>

      {advice.avoidStockpile.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            不建议囤的品类
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {advice.avoidStockpile.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <BabySizePosterExportZone bundle={exportBundle} />

      <section className="mb-6 space-y-4">
        {fallWinterSeasonSectionHint(advice.purchaseListFocus) ? (
          <p className="text-xs leading-relaxed text-stone-500">
            {fallWinterSeasonSectionHint(advice.purchaseListFocus)}
          </p>
        ) : null}
        {shouldShowSummerSeasonCard(advice.purchaseListFocus) ? (
          <SeasonAdviceCard title="夏装建议" advice={advice.summer} />
        ) : null}
        <SeasonAdviceCard title="秋装建议" advice={advice.fall} />
        <SeasonAdviceCard title="冬装建议" advice={advice.winter} />
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          未来 6–9 个月尺码日历
        </h2>
        <p className="mt-2 text-pretty text-xs leading-relaxed text-stone-500 sm:text-sm">
          {advice.calendarStartsFromDueMonth ? (
            <span className="block space-y-1.5">
              <span className="block">
                预产期晚于本月：日历从<strong>预产期所在月</strong>起连续 9 个月。
              </span>
              <span className="block">
                「月龄」按<strong>自然月</strong>计：出生当月 0 月龄，次月 1 月龄；与当月是几号无关。
              </span>
            </span>
          ) : (
            <span>尺码按月龄与身高参考推算，请以每月实际测量为准。</span>
          )}
        </p>
        <div className="-mx-1 mt-4 overflow-x-auto overscroll-x-contain rounded-xl border border-stone-100 px-1 touch-pan-x sm:mx-0 sm:px-0">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-xs font-medium text-stone-600">
                <th className="px-2 py-2.5 sm:px-3">月份</th>
                <th className="px-2 py-2.5 sm:px-3">月龄</th>
                <th className="px-2 py-2.5 sm:px-3">参考身高</th>
                <th className="px-2 py-2.5 sm:px-3">参考码</th>
              </tr>
            </thead>
            <tbody>
              {advice.calendar.map((row) => (
                <tr key={row.monthKey} className="border-b border-stone-50 last:border-0">
                  <td className="px-2 py-2.5 font-medium text-stone-800 sm:px-3 sm:py-2.5">
                    {row.label}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-stone-600 sm:px-3 sm:py-2.5">
                    {row.ageMonths} 月
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-stone-600 sm:px-3 sm:py-2.5">
                    约 {row.heightCm} cm
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-2.5">
                    <span className="rounded-md bg-orange-50 px-2 py-0.5 font-semibold text-orange-800">
                      {row.size}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BabySizeResultActions exportBundle={exportBundle} />

      <section className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-4 text-center sm:p-6">
        <p className="text-sm font-medium text-stone-800">关注公众号</p>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          也可点页面底部或「保存 / 转发清单长图」生成高清长图转发家人。
        </p>
        <p className="mt-6 text-base font-semibold text-stone-900">公众号：CC的数据线</p>
        <p className="mt-1.5 text-pretty text-xs leading-relaxed text-stone-600">
          打开微信「搜一搜」输入名称，或扫描下图二维码关注。
        </p>
        <div className="mx-auto mt-4 max-w-md px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/baby-size-calendar/wechat-cc-banner.png"
            alt="微信搜一搜：CC的数据线"
            width={1024}
            height={373}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-xl border border-orange-100/80 shadow-sm"
          />
        </div>
      </section>

      <p className="mt-8 text-center text-xs leading-relaxed text-stone-500">
        {advice.disclaimer}
      </p>
      <p className="mt-2 text-center text-[10px] text-stone-400">{APP_BUILD_TAG}</p>
    </main>
    </ResultPageShell>
  );
}

function purchaseWearPeriodLines(text: string): string[] {
  if (!text || text === "—") return [text];
  return text
    .split(/\s*[；;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function PurchaseWearPeriod({ value }: { value: string }) {
  const parts = purchaseWearPeriodLines(value);
  if (parts.length <= 1) {
    return <span className="leading-snug">{value}</span>;
  }
  return (
    <span className="flex flex-col gap-1.5 leading-snug">
      {parts.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}

function SeasonAdviceCard({
  title,
  advice,
}: {
  title: string;
  advice: SeasonAdviceDetail;
}) {
  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">{title}</h2>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-stone-700">{advice.summary}</p>
      {advice.garments.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-100">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-xs font-medium text-stone-600">
                <th className="px-3 py-2.5">品类</th>
                <th className="px-3 py-2.5 whitespace-nowrap">建议码</th>
                <th className="px-3 py-2.5 whitespace-nowrap">必备件数</th>
                <th className="px-3 py-2.5">说明</th>
              </tr>
            </thead>
            <tbody>
              {advice.garments.map((row) => (
                <tr key={row.category} className="border-b border-stone-50 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-stone-800">{row.category}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-orange-800">
                    {row.size}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-stone-800">
                    {row.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-stone-600">{row.tip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
