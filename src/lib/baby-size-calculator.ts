/** 中国童装常见「码段」与身高参考（cm），用于建议展示 */

import type { Gender, PercentileBand } from "@/lib/who-height-reference";
import {
  getNearestPercentileBand,
  round1,
  whoInterpolateHeight,
  whoProjectFromP3P97Position,
} from "@/lib/who-height-reference";
import type { ClimateZone } from "@/lib/climate-types";
import { ZONE_LABEL } from "@/lib/climate-types";
import { getClimateZoneForLocality } from "@/lib/china-locality-climate";
import { getProvinceName } from "@/lib/china-locality-options";
import { getHeightWeightWarning } from "@/lib/baby-size-validation";
import {
  BRAND_SIZING_NOTE,
  buildClimateZoneExplanation,
  buildRegionalLivingHint,
} from "@/lib/baby-size-regional-hints";
import { buildNewbornParentTips } from "@/lib/baby-size-newborn-hints";
import { MAX_SUPPORTED_AGE_MONTHS } from "@/lib/baby-size-age-limits";
import { auditSizeAdvice } from "@/lib/baby-size-sanity";
import {
  measuredHeightResultNotice,
  type HeightProjectionMode,
} from "@/lib/baby-size-measured-height";
import { percentileBandTitle } from "@/lib/percentile-band-labels";
import {
  buildShoppingFocusNote,
  is618SummerShoppingWindow,
  resolvePurchaseListFocus,
  type PurchaseListFocus,
} from "@/lib/shopping-season-focus";
export type { HeightProjectionMode } from "@/lib/baby-size-measured-height";

export type { Gender, PercentileBand } from "@/lib/who-height-reference";
export type { ClimateZone } from "@/lib/climate-types";

export const SIZE_CODES = [52, 59, 66, 73, 80, 90, 100, 110, 120, 130] as const;
export type SizeCode = (typeof SIZE_CODES)[number];

export interface BabyInput {
  birthDate: string; // YYYY-MM-DD（表单仅选年月时日为 15）
  provinceCode: string;
  municipality: string;
  gender: Gender;
  percentileBand: PercentileBand;
  heightCm: number | null;
  weightKg: number | null;
  /** 实测超出 WHO 带且用户确认后：按实测锚点外推，不再静默压回上限 */
  heightProjectionMode?: HeightProjectionMode;
}

export interface MonthProjection {
  monthKey: string; // YYYY-MM
  label: string; // 如 2026年6月
  ageMonths: number;
  heightCm: number;
  size: SizeCode;
}

export interface GarmentAdviceItem {
  category: string;
  size: string;
  /** 结合气候 + 季内月龄 + 是否跨码 */
  quantity: string;
  tip?: string;
}

export interface SeasonAdviceDetail {
  summary: string;
  /** 本季在日历中对应的自然月（与下方尺码表一致） */
  coveredMonths: string;
  garments: GarmentAdviceItem[];
  /** 本季囤货合并后各码穿着月（购买件数分摊用） */
  wearPeriodBySize: Partial<Record<SizeCode, string>>;
  /** 尺码日历各行「参考码」对应的自然月（未做单月并入），购买清单展示用 */
  calendarWearPeriodBySize: Partial<Record<SizeCode, string>>;
  /** 本季日历行（购买清单解析季末过渡码用） */
  monthRows: MonthProjection[];
}

/** 末尾购买清单汇总行 */
export interface PurchaseListItem {
  style: string;
  size: string;
  wearPeriod: string;
  quantity: string;
}

export interface SizeAdvice {
  ageMonths: number;
  currentMainSize: SizeCode;
  summer: SeasonAdviceDetail;
  fall: SeasonAdviceDetail;
  winter: SeasonAdviceDetail;
  /** 夏/秋/冬可购品类合并清单 */
  purchaseList: PurchaseListItem[];
  avoidStockpile: string[];
  calendar: MonthProjection[];
  climateZone: ClimateZone;
  climateLabel: string;
  /** 展示用：省 · 地级市 */
  localityLabel: string;
  whoReferenceSummary: string | null;
  /** 有实测身高时：与当月 WHO 插值行上 P3/P50/P97 谁最接近 */
  nearestPercentileBand: PercentileBand | null;
  /** 出生日晚于今天时，日历从「出生日所在月」的 1 号起算，而非从本月起算 */
  calendarStartsFromDueMonth: boolean;
  disclaimer: string;
  /** 身高体重比例异常时的友好提示（不阻断计算） */
  heightWeightWarning: string | null;
  /** 实测锚点推算时的说明 */
  measuredHeightNotice: string | null;
  heightProjectionMode: HeightProjectionMode;
  /** 南北方室内穿衣差异话术 */
  regionalLivingHint: string;
  /** 气候带归类说明（如青岛为何按湿冷型） */
  climateZoneExplanation: string;
  /** 常见品牌偏码提醒 */
  brandSizingNote: string;
  /** 新生儿家长避坑提示（≤3 月龄） */
  newbornParentTips: string[];
  /** 购买清单是否仅含夏装（618 大促期） */
  purchaseListFocus: PurchaseListFocus;
  /** 大促以夏装为主时的说明 */
  shoppingFocusNote: string | null;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12;
  months -= from.getMonth();
  months += to.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * 根据生日与实测身高，在 WHO 当月插值 P3/P50/P97 中取与身高最接近的一档（与有身高时结果页的 nearest 规则一致）。
 * 体重不参与 WHO 分位；未填身高时不要调用（表单侧用默认 P50）。
 */
export function suggestPercentileBandFromMeasuredHeight(
  birthDateYmd: string,
  gender: Gender,
  heightCm: number,
  measuredAt: Date = new Date(),
): PercentileBand {
  const birth = parseLocalDate(birthDateYmd);
  const ageMonths = monthsBetween(birth, measuredAt);
  return getNearestPercentileBand(gender, ageMonths, heightCm);
}

/**
 * 尺码日历按「自然月」计龄：出生当月 = 0 月龄，次月 = 1 月龄……
 * 与行内锚点日期是 1 号还是 15 号无关，避免 9/15 预产期时 10 月仍显示 0 月龄。
 */
function calendarRowAgeMonths(birth: Date, calendarMonthAnchor: Date): number {
  const birthIndex = birth.getFullYear() * 12 + birth.getMonth();
  const rowIndex =
    calendarMonthAnchor.getFullYear() * 12 + calendarMonthAnchor.getMonth();
  return Math.max(0, rowIndex - birthIndex);
}

function projectHeightForCalendarRow(
  birth: Date,
  calendarMonthAnchor: Date,
  gender: Gender,
  percentileBand: PercentileBand,
  measuredHeight: number | null,
  measuredAtDate: Date,
  projectionMode: HeightProjectionMode,
): number {
  const rowAge = calendarRowAgeMonths(birth, calendarMonthAnchor);

  if (measuredHeight != null && measuredHeight > 40) {
    const ageNow = monthsBetween(birth, measuredAtDate);
    if (projectionMode === "measured_anchor") {
      const raw = Math.round(measuredHeight);
      if (rowAge <= ageNow) return raw;
      const p50Now = whoInterpolateHeight(gender, ageNow, "P50");
      const p50Row = whoInterpolateHeight(gender, rowAge, "P50");
      return round1(raw + (p50Row - p50Now));
    }
    const measured = clampHeightToAgeBand(gender, ageNow, measuredHeight);
    if (rowAge <= ageNow) {
      return clampHeightToAgeBand(gender, rowAge, measured);
    }
    const projected = whoProjectFromP3P97Position(gender, ageNow, rowAge, measured);
    return clampHeightToAgeBand(gender, rowAge, projected);
  }

  return clampHeightToAgeBand(
    gender,
    rowAge,
    whoInterpolateHeight(gender, rowAge, percentileBand),
  );
}

/** 仅比较日期（忽略时分秒）：预产期是否尚未到 */
function isBirthDateAfterToday(birth: Date, now: Date): boolean {
  const b = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return b.getTime() > t.getTime();
}

/**
 * 身高 → 参考码（与 WHO 投影身高一致）。
 * 小月龄常见档：52(≤52cm)、59(52–56)、66(56–62)、73(62–69)；
 * 其中 59 档身高窗口最窄，日历里常只占 1 个自然月。
 */
export function heightToSizeCode(h: number): SizeCode {
  if (h <= 52) return 52;
  if (h < 56) return 59;
  if (h < 62) return 66;
  if (h < 69) return 73;
  if (h < 76) return 80;
  if (h < 86) return 90;
  if (h < 96) return 100;
  if (h < 106) return 110;
  if (h < 116) return 120;
  return 130;
}

/** 该月龄 WHO P97 + 外穿余量（cm），防止错填身高/外推导致 120、130 等离谱码数 */
export function maxReasonableHeightCm(gender: Gender, ageMonths: number): number {
  const age = Math.max(0, ageMonths);
  const p97 = whoInterpolateHeight(gender, age, "P97");
  const bump = age < 6 ? 7 : age < 12 ? 9 : age < 24 ? 11 : 13;
  return Math.round(p97 + bump);
}

function minReasonableHeightCm(gender: Gender, ageMonths: number): number {
  const p3 = whoInterpolateHeight(gender, Math.max(0, ageMonths), "P3");
  return Math.max(40, Math.round(p3 - 5));
}

/** 按 WHO 带钳制身高，避免小月龄出现 130 码等异常 */
export function clampHeightToAgeBand(
  gender: Gender,
  ageMonths: number,
  heightCm: number,
): number {
  const lo = minReasonableHeightCm(gender, ageMonths);
  const hi = maxReasonableHeightCm(gender, ageMonths);
  return Math.min(hi, Math.max(lo, Math.round(heightCm)));
}

/** 该月龄建议码上限（含外套可略大一档） */
export function maxSizeForAgeMonths(gender: Gender, ageMonths: number): SizeCode {
  return heightToSizeCode(maxReasonableHeightCm(gender, ageMonths));
}

function capSizeAtMax(size: SizeCode, max: SizeCode): SizeCode {
  return sizeIndex(size) <= sizeIndex(max) ? size : max;
}

function sizeFromHeightForAge(gender: Gender, ageMonths: number, heightCm: number): SizeCode {
  const h = clampHeightToAgeBand(gender, ageMonths, heightCm);
  return capSizeAtMax(heightToSizeCode(h), maxSizeForAgeMonths(gender, ageMonths));
}

/**
 * 推断衣码时用的「有效月龄」：日历行可显示更远月份，但小月龄不应按 WHO 60 月端点推到 130 码。
 * 错填生日（把大孩子填成新生儿）时仍可能偏大，需结合页面超龄提示与身高校验。
 */
export function ageMonthsForSizeInference(
  currentAgeMonths: number,
  rowAgeMonths: number,
): number {
  const cur = Math.max(0, currentAgeMonths);
  const row = Math.max(0, rowAgeMonths);
  if (cur <= 3) return Math.min(row, cur + 8);
  if (cur < 12) return Math.min(row, cur + 12);
  if (cur < 24) return Math.min(row, cur + 18);
  return Math.min(row, MAX_SUPPORTED_AGE_MONTHS);
}

function sizeFromHeightForCalendarRow(
  gender: Gender,
  currentAgeMonths: number,
  rowAgeMonths: number,
  heightCm: number,
): SizeCode {
  return sizeFromHeightForAge(
    gender,
    ageMonthsForSizeInference(currentAgeMonths, rowAgeMonths),
    heightCm,
  );
}

function capBuySizesForAge(
  gender: Gender,
  currentAgeMonths: number,
  peakRowAgeMonths: number,
  sizes: SizeCode[],
): SizeCode[] {
  const max = maxSizeForAgeMonths(
    gender,
    ageMonthsForSizeInference(currentAgeMonths, peakRowAgeMonths),
  );
  return sizes
    .map((s) => capSizeAtMax(s, max))
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

/** 解析 URL/表单身高：按月龄限制上限，避免 600→150、130 等错填直接算出 130 码 */
export function parseHeightCmInput(
  birthDateYmd: string,
  gender: Gender,
  raw: string | undefined,
  now = new Date(),
  options?: { trustMeasured?: boolean },
): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const birth = parseLocalDate(birthDateYmd);
  const ageMonths = monthsBetween(birth, now);
  if (n < 40) return null;
  if (options?.trustMeasured) {
    return Math.min(150, Math.max(40, Math.round(n)));
  }
  const hi = maxReasonableHeightCm(gender, ageMonths) + 3;
  return Math.min(150, Math.min(hi, Math.max(40, n)));
}

function nextSize(s: SizeCode): SizeCode {
  const i = SIZE_CODES.indexOf(s);
  return SIZE_CODES[Math.min(SIZE_CODES.length - 1, i + 1)] ?? 130;
}

function climateForLocality(
  provinceName: string,
  municipalityName: string,
): { zone: ClimateZone; label: string } {
  const zone = getClimateZoneForLocality(provinceName, municipalityName);
  return { zone, label: ZONE_LABEL[zone] };
}

function buildAvoidList(
  ageMonths: number,
  main: SizeCode,
  zone: ClimateZone,
): string[] {
  const list: string[] = [];
  if (ageMonths >= 10) {
    list.push("连体衣 / 哈衣：若已会走，少囤，优先分体方便换尿布与活动。");
  }
  if (ageMonths >= 18) {
    list.push("过多同码内衣裤：如厕训练期尺码变化快，按季少量即可。");
  }
  if (zone === "hot_humid") {
    list.push("厚羽绒 / 厚棉服：当地冬季短，避免一次囤多件同码厚外套。");
  }
  if (zone === "north_cold") {
    list.push("仅「好看」的薄外套：北方冬季需叠穿，单层时尚款利用率可能低。");
  }
  list.push("袜子、帽子：生长快、易丢，不建议按「年」大量囤同一尺码。");
  list.push("礼盒装多件套：常有尺码偏杂，不如按实际需要单件购买。");
  if (is618SummerShoppingWindow()) {
    list.push(
      "秋/冬厚外套、羽绒：见下方「秋装/冬装建议」，按实际需要选码即可。",
    );
  }
  return list.slice(0, 5);
}

function fmtSize(s: SizeCode): string {
  return `${s} 码`;
}

/** 顿号列出待购码段，如「52、59、66 码」（非连续区间） */
function fmtSizeList(sizes: SizeCode[]): string {
  if (sizes.length === 0) return "—";
  if (sizes.length === 1) return fmtSize(sizes[0]!);
  return `${sizes.join("、")} 码`;
}

function sizeIndex(s: SizeCode): number {
  return SIZE_CODES.indexOf(s);
}

/** 59 档身高窗口约 4cm，日历中常作 52→66 之间的单月过渡 */
function isNarrowInfantSize(s: SizeCode): boolean {
  return s === 59;
}

type SeasonPurchasePlan = {
  min: SizeCode;
  main: SizeCode;
  buySizes: SizeCode[];
  /** 本季各码「计为穿着」的自然月数（过渡/单月码会并入下一档偏大码） */
  wearMonths: Map<SizeCode, number>;
  calendarMonths: Map<SizeCode, number>;
};

function nextLargerSizeInCalendarRows(
  from: SizeCode,
  rows: MonthProjection[],
): SizeCode | null {
  const fromIdx = sizeIndex(from);
  let target: SizeCode | null = null;
  let bestIdx = Infinity;
  for (const r of rows) {
    const si = sizeIndex(r.size);
    if (si > fromIdx && si < bestIdx) {
      bestIdx = si;
      target = r.size;
    }
  }
  return target;
}

function maxSizeInSeasonRows(rows: MonthProjection[]): SizeCode {
  return rows.reduce((m, r) => maxSizeCode(m, r.size), rows[0]!.size);
}

/**
 * 囤货合并目标：优先本季日历出现的下一档，否则取码表下一档；
 * 不得超过当季日历最大码（避免 8 月仅 73 却硬并到 80）与月龄合理上限。
 */
function mergeTargetForSingleMonth(
  size: SizeCode,
  rows: MonthProjection[],
  gender: Gender,
  currentAgeMonths: number,
): SizeCode | null {
  const peakRowAge = rows.reduce((p, r) => Math.max(p, r.ageMonths), rows[0]?.ageMonths ?? 0);
  const maxSz = maxSizeForAgeMonths(
    gender,
    ageMonthsForSizeInference(currentAgeMonths, peakRowAge),
  );
  const seasonMax = maxSizeInSeasonRows(rows);
  const inCalendar = nextLargerSizeInCalendarRows(size, rows);
  const candidate = inCalendar ?? nextSize(size);
  if (sizeIndex(candidate) > sizeIndex(seasonMax)) return null;
  if (sizeIndex(candidate) <= sizeIndex(maxSz)) return candidate;
  if (inCalendar && sizeIndex(inCalendar) <= sizeIndex(maxSz)) return inCalendar;
  return null;
}

function largestWearSize(wearMonths: Map<SizeCode, number>): SizeCode {
  for (let i = SIZE_CODES.length - 1; i >= 0; i--) {
    const s = SIZE_CODES[i]!;
    if ((wearMonths.get(s) ?? 0) > 0) return s;
  }
  return 52;
}

/** 季初首码且非 59：哪怕日历里只有 1 个月也单独囤（如新生儿首月 52） */
function isSeasonStartStockAnchor(size: SizeCode, calendarMin: SizeCode): boolean {
  return size === calendarMin && !isNarrowInfantSize(size);
}

function mergeWearMonthInto(
  wearMonths: Map<SizeCode, number>,
  from: SizeCode,
  to: SizeCode,
): void {
  const n = wearMonths.get(from) ?? 0;
  if (n <= 0 || from === to) return;
  wearMonths.set(to, (wearMonths.get(to) ?? 0) + n);
  wearMonths.set(from, 0);
}

/**
 * 由当季日历行（52/59/66/73… 均由身高算出）推导囤货码与穿着月数：
 * - 日历仍逐月显示 WHO 映射出的每一档；
 * - 囤货侧：仅 1 个月的码一律并入更大一档（59→66、73→80 等），季末 73 也不例外；
 * - 例外：季初首码且非 59（如首月 52）可单独囤；
 * - 穿着月≥2 的码、以及合并后的季末主力码建议购买；件数按穿着月数分摊。
 */
function computeSeasonPurchasePlan(
  rows: MonthProjection[],
  gender: Gender,
  currentAgeMonths: number,
): SeasonPurchasePlan {
  const calendarMin = rows.reduce(
    (m, r) => minSizeCode(m, r.size),
    rows[0]!.size,
  );
  const calendarMain = rows.reduce(
    (m, r) => maxSizeCode(m, r.size),
    rows[0]!.size,
  );

  const calendarMonths = new Map<SizeCode, number>();
  for (const r of rows) {
    calendarMonths.set(r.size, (calendarMonths.get(r.size) ?? 0) + 1);
  }

  const wearMonths = new Map<SizeCode, number>();
  for (const s of SIZE_CODES) {
    const c = calendarMonths.get(s);
    if (c) wearMonths.set(s, c);
  }

  for (const size of [...SIZE_CODES]) {
    const cal = wearMonths.get(size) ?? 0;
    if (cal === 0) continue;
    const mergeSingle = cal <= 1 && !isSeasonStartStockAnchor(size, calendarMin);
    if (!mergeSingle) continue;

    const target = mergeTargetForSingleMonth(size, rows, gender, currentAgeMonths);
    if (target && target !== size) mergeWearMonthInto(wearMonths, size, target);
  }

  if (calendarMain !== 59) {
    const w59 = wearMonths.get(59) ?? 0;
    const w66 = wearMonths.get(66) ?? 0;
    if (w59 > 0 && w66 > 0) mergeWearMonthInto(wearMonths, 59, 66);
    else if (w59 > 0 && w66 === 0) {
      const target = mergeTargetForSingleMonth(59, rows, gender, currentAgeMonths);
      if (target) mergeWearMonthInto(wearMonths, 59, target);
    }
  }

  const peakRowAge = rows.reduce((p, r) => Math.max(p, r.ageMonths), rows[0]?.ageMonths ?? 0);
  const maxSz = maxSizeForAgeMonths(
    gender,
    ageMonthsForSizeInference(currentAgeMonths, peakRowAge),
  );
  for (const s of SIZE_CODES) {
    if (sizeIndex(s) <= sizeIndex(maxSz)) continue;
    const n = wearMonths.get(s) ?? 0;
    if (n <= 0) continue;
    wearMonths.set(maxSz, (wearMonths.get(maxSz) ?? 0) + n);
    wearMonths.set(s, 0);
  }

  const stockMain = largestWearSize(wearMonths);
  const purchase = new Set<SizeCode>();

  if ((wearMonths.get(calendarMin) ?? 0) > 0 && isSeasonStartStockAnchor(calendarMin, calendarMin)) {
    purchase.add(calendarMin);
  }
  for (const s of SIZE_CODES) {
    const w = wearMonths.get(s) ?? 0;
    if (w >= 2) purchase.add(s);
  }
  if ((wearMonths.get(stockMain) ?? 0) > 0) {
    purchase.add(stockMain);
  }

  let buySizes = SIZE_CODES.filter((s) => purchase.has(s));
  buySizes = capBuySizesForAge(gender, currentAgeMonths, peakRowAge, buySizes);
  const main = capSizeAtMax(stockMain, maxSz);
  const min = capSizeAtMax(calendarMin, maxSz);

  return {
    min,
    main,
    buySizes,
    wearMonths,
    calendarMonths,
  };
}

type SeasonKey = "summer" | "fall" | "winter";

const SUMMER_MONTHS = new Set([6, 7, 8]);
const FALL_MONTHS = new Set([9, 10, 11]);
const WINTER_MONTHS = new Set([12, 1, 2]);

function calendarMonthNumber(monthKey: string): number {
  return Number(monthKey.split("-")[1]);
}

function seasonForCalendarMonth(m: number): SeasonKey | null {
  if (SUMMER_MONTHS.has(m)) return "summer";
  if (FALL_MONTHS.has(m)) return "fall";
  if (WINTER_MONTHS.has(m)) return "winter";
  return null;
}

function maxSizeCode(a: SizeCode, b: SizeCode): SizeCode {
  return SIZE_CODES.indexOf(a) >= SIZE_CODES.indexOf(b) ? a : b;
}

function minSizeCode(a: SizeCode, b: SizeCode): SizeCode {
  return SIZE_CODES.indexOf(a) <= SIZE_CODES.indexOf(b) ? a : b;
}

function buildCalendarRow(
  birth: Date,
  anchor: Date,
  gender: Gender,
  percentileBand: PercentileBand,
  measuredHeight: number | null,
  measuredAtDate: Date,
  currentAgeMonths: number,
  projectionMode: HeightProjectionMode,
): MonthProjection {
  const m = calendarRowAgeMonths(birth, anchor);
  const h = projectHeightForCalendarRow(
    birth,
    anchor,
    gender,
    percentileBand,
    measuredHeight,
    measuredAtDate,
    projectionMode,
  );
  return {
    monthKey: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`,
    label: `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`,
    ageMonths: m,
    heightCm: h,
    size: sizeFromHeightForCalendarRow(gender, currentAgeMonths, m, h),
  };
}

/** 从已展示的日历取该季行；若无则沿时间轴向前推算该季自然月（最多 18 个月） */
function collectSeasonRows(
  season: SeasonKey,
  calendar: MonthProjection[],
  birth: Date,
  calendarStartDate: Date,
  gender: Gender,
  percentileBand: PercentileBand,
  measuredHeight: number | null,
  measuredAtDate: Date,
  currentAgeMonths: number,
  projectionMode: HeightProjectionMode,
): MonthProjection[] {
  const fromCalendar = calendar.filter(
    (r) => seasonForCalendarMonth(calendarMonthNumber(r.monthKey)) === season,
  );
  if (fromCalendar.length > 0) return fromCalendar;

  const found: MonthProjection[] = [];
  for (let i = 0; i < 18; i++) {
    const d = addMonths(calendarStartDate, i);
    if (seasonForCalendarMonth(d.getMonth() + 1) === season) {
      found.push(
        buildCalendarRow(
          birth,
          d,
          gender,
          percentileBand,
          measuredHeight,
          measuredAtDate,
          currentAgeMonths,
          projectionMode,
        ),
      );
    }
  }
  return found;
}

interface SeasonSizing {
  rows: MonthProjection[];
  main: SizeCode;
  min: SizeCode;
  buySizes: SizeCode[];
  wearMonths: Map<SizeCode, number>;
  peakAgeMonths: number;
  monthLabels: string[];
}

function aggregateSeasonSizing(
  rows: MonthProjection[],
  gender: Gender,
  currentAgeMonths: number,
): SeasonSizing | null {
  if (rows.length === 0) return null;
  let peakAgeMonths = rows[0]!.ageMonths;
  const monthLabels: string[] = [];
  for (const row of rows) {
    peakAgeMonths = Math.max(peakAgeMonths, row.ageMonths);
    monthLabels.push(row.label);
  }
  const plan = computeSeasonPurchasePlan(rows, gender, currentAgeMonths);
  return {
    rows,
    main: plan.main,
    min: plan.min,
    buySizes: plan.buySizes,
    wearMonths: plan.wearMonths,
    peakAgeMonths,
    monthLabels,
  };
}

/** 夏装对应月份是否已在「来年及更远」的 6–8 月（当前不宜囤） */
function isDeferredSummerPurchase(rows: MonthProjection[], now: Date): boolean {
  if (rows.length === 0) return false;
  const currentYear = now.getFullYear();
  const years = rows.map((r) => Number(r.monthKey.split("-")[0]));
  return Math.min(...years) > currentYear;
}

function buildSeasonalGarmentAdvice(
  calendar: MonthProjection[],
  birth: Date,
  calendarStartDate: Date,
  gender: Gender,
  percentileBand: PercentileBand,
  measuredHeight: number | null,
  measuredAtDate: Date,
  zone: ClimateZone,
  winterBump: 0 | 1,
  now: Date,
  currentAgeMonths: number,
  projectionMode: HeightProjectionMode,
): { summer: SeasonAdviceDetail; fall: SeasonAdviceDetail; winter: SeasonAdviceDetail } {
  const collect = (season: SeasonKey) =>
    collectSeasonRows(
      season,
      calendar,
      birth,
      calendarStartDate,
      gender,
      percentileBand,
      measuredHeight,
      measuredAtDate,
      currentAgeMonths,
      projectionMode,
    );

  const summerSizing = aggregateSeasonSizing(collect("summer"), gender, currentAgeMonths);
  const fallSizing = aggregateSeasonSizing(collect("fall"), gender, currentAgeMonths);
  const winterSizing = aggregateSeasonSizing(collect("winter"), gender, currentAgeMonths);

  return {
    summer: buildOneSeasonAdvice(
      "summer",
      summerSizing,
      zone,
      winterBump,
      false,
      now,
      gender,
      currentAgeMonths,
    ),
    fall: buildOneSeasonAdvice(
      "fall",
      fallSizing,
      zone,
      winterBump,
      false,
      now,
      gender,
      currentAgeMonths,
    ),
    winter: buildOneSeasonAdvice(
      "winter",
      winterSizing,
      zone,
      winterBump,
      true,
      now,
      gender,
      currentAgeMonths,
    ),
  };
}

function buildOneSeasonAdvice(
  season: SeasonKey,
  sizing: SeasonSizing | null,
  zone: ClimateZone,
  winterBump: 0 | 1,
  isWinter: boolean,
  now: Date,
  gender: Gender,
  currentAgeMonths: number,
): SeasonAdviceDetail {
  const seasonLabel = season === "summer" ? "夏装" : season === "fall" ? "秋装" : "冬装";

  if (!sizing) {
    return {
      summary: `近期尺码日历中暂无 ${season === "summer" ? "6–8" : season === "fall" ? "9–11" : "12–2"} 月，暂不生成${seasonLabel}买码表；请以下方日历为准或临近该季再算。`,
      coveredMonths: "—",
      garments: [],
      wearPeriodBySize: {},
      calendarWearPeriodBySize: {},
      monthRows: [],
    };
  }

  const { main, min, buySizes, peakAgeMonths, monthLabels, rows } = sizing;
  const coveredMonths = monthLabels.join("、");

  if (season === "summer" && isDeferredSummerPurchase(rows, now)) {
    const refNote =
      buySizes.length > 0
        ? `（该季参考码 ${fmtSizeList(buySizes)}，仅供备忘）`
        : "";
    return {
      summary: `对应 ${coveredMonths}，为来年夏季${refNote}。距穿着尚早，现阶段不建议囤夏装；请以下方尺码日历为准，临近当季再算。`,
      coveredMonths,
      garments: [],
      wearPeriodBySize: buildWearPeriodBySizeForRows(
        rows,
        sizing.wearMonths,
        sizing.buySizes,
      ),
      calendarWearPeriodBySize: buildCalendarWearPeriodBySize(rows),
      monthRows: rows,
    };
  }

  const { wearMonths } = sizing;
  const isInfant = peakAgeMonths < 9 || main <= 73;
  const sizingPeakAge = ageMonthsForSizeInference(currentAgeMonths, peakAgeMonths);
  const maxForPeak = maxSizeForAgeMonths(gender, sizingPeakAge);
  const buyCap = buySizes.reduce((m, s) => maxSizeCode(m, s), main);
  let up = capSizeAtMax(nextSize(main), maxForPeak);
  if (isInfant) up = capSizeAtMax(up, buyCap);
  const winterOuter: SizeCode = capSizeAtMax(
    isWinter && winterBump ? up : main,
    maxForPeak,
  );
  const coveredMonthsJoined = monthLabels.join("、");
  const sizesLabel = fmtSizeList(buySizes);
  const spanNote =
    buySizes.length > 1
      ? `（按穿着月数选 ${buySizes.length} 个囤货码；仅 1 个月的过渡码并入季内下一档如 59→66，件数按穿着月分摊）`
      : "";

  const garments = buildGarmentListForSeason(
    season,
    isInfant,
    peakAgeMonths,
    buySizes,
    wearMonths,
    main,
    up,
    winterOuter,
    zone,
    isWinter,
    winterBump,
  );

  const qtyHint =
    peakAgeMonths < 6
      ? "小月龄换洗勤，贴身总量按穿着月数分配；仅 1 个月的过渡码并入季内下一档，不单囤。"
      : peakAgeMonths < 12
        ? "会爬会站易脏，以替换为主，外穿各 1 件通常够穿一季。"
        : "同码不必囤满整季，裤子可多 1～2 条。";

  let summary: string;
  if (season === "summer") {
    const promo =
      is618SummerShoppingWindow(now) && garments.length > 0
        ? " 可按本表选购。"
        : "";
    summary = `对应 ${coveredMonthsJoined}，建议码 ${sizesLabel}${spanNote}。${qtyHint}${promo}`;
  } else if (season === "fall") {
    summary = `对应 ${coveredMonthsJoined}，建议码 ${sizesLabel}${spanNote}；薄外套可参考 ${fmtSize(up)}。${qtyHint}`;
  } else {
    summary = `对应 ${coveredMonthsJoined}，贴身 ${sizesLabel}，外穿主力 ${fmtSize(winterOuter)}${spanNote}。${qtyHint}`;
  }

  return {
    summary,
    coveredMonths: coveredMonthsJoined,
    garments,
    wearPeriodBySize: buildWearPeriodBySizeForRows(rows, wearMonths, buySizes),
    calendarWearPeriodBySize: buildCalendarWearPeriodBySize(rows),
    monthRows: rows,
  };
}

type GarmentQtyProfile =
  | "daily_romper"
  | "bodysuit"
  | "long_sleeve_base"
  | "top"
  | "bottom"
  | "cardigan"
  | "outer_light"
  | "outer_heavy"
  | "inner_warm"
  | "accessory";

interface QtyParams {
  peakAgeMonths: number;
  zone: ClimateZone;
  season: SeasonKey;
  buySizes: SizeCode[];
  wearMonths: Map<SizeCode, number>;
  isInfant: boolean;
}

function monthWeightsForBuySizes(
  buySizes: SizeCode[],
  wearMonths: Map<SizeCode, number>,
): number[] {
  return buySizes.map((s) => Math.max(1, wearMonths.get(s) ?? 1));
}

/** 按各码穿着月数在季内分摊件数，避免每个码都按整季量囤 */
function splitPiecesAcrossSizes(
  buySizes: SizeCode[],
  weights: number[],
  totalLo: number,
  totalHi: number,
): string {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (buySizes.length === 0) return qtyPieces(totalLo, totalHi);
  if (buySizes.length === 1) return qtyPieces(totalLo, totalHi);

  if (buySizes.length === 2) {
    const [early, late] = buySizes;
    const earlyN = Math.max(
      1,
      Math.min(totalLo - 1, Math.round((totalLo * weights[0]!) / sum)),
    );
    const lateLo = Math.max(1, totalLo - earlyN);
    const lateHi = Math.max(lateLo, totalHi - earlyN);
    return `${early} 码 ${earlyN} 件 + ${late} 码 ${qtyPieces(lateLo, lateHi)}`;
  }

  const parts: string[] = [];
  let allocatedLo = 0;
  for (let i = 0; i < buySizes.length; i++) {
    const isLast = i === buySizes.length - 1;
    if (isLast) {
      const remLo = Math.max(1, totalLo - allocatedLo);
      const remHi = Math.max(remLo, totalHi - allocatedLo);
      parts.push(`${buySizes[i]} 码 ${qtyPieces(remLo, remHi)}`);
    } else {
      const n = Math.max(1, Math.round((totalLo * weights[i]!) / sum));
      const capped = Math.min(n, totalLo - (buySizes.length - i - 1));
      parts.push(`${buySizes[i]} 码 ${capped} 件`);
      allocatedLo += capped;
    }
  }
  return parts.join(" + ");
}

function qtyPieces(min: number, max: number): string {
  return min === max ? `${min} 件` : `${min}～${max} 件`;
}

/** 贴身主力：整季总量；跨码时小码少量、大码承担主力，不翻倍 */
function recommendQuantity(profile: GarmentQtyProfile, p: QtyParams): string {
  const { peakAgeMonths: age, zone, season, buySizes, wearMonths, isInfant } = p;
  const n = buySizes.length;
  const weights = monthWeightsForBuySizes(buySizes, wearMonths);
  const young = age < 3;
  const midInfant = age >= 3 && age < 9;

  if (profile === "accessory") {
    if (season === "summer") return "袜 2～3 双、帽 1 顶";
    if (season === "winter") return "帽 1 顶、袜 2～3 双";
    return "袜 2 双";
  }

  // 外套 / 开衫：通常单码，不按季翻倍
  if (
    profile === "outer_heavy" ||
    profile === "outer_light" ||
    profile === "cardigan"
  ) {
    return qtyPieces(1, zone === "north_cold" && profile === "outer_heavy" ? 2 : 1);
  }

  let totalLo: number;
  let totalHi: number;

  if (profile === "daily_romper" || profile === "bodysuit") {
    totalLo = young ? 4 : midInfant ? 3 : 3;
    totalHi = young ? 5 : midInfant ? 4 : 4;
    if (zone === "hot_humid" && season === "summer") {
      totalHi += 1;
    }
  } else if (profile === "long_sleeve_base" || profile === "inner_warm") {
    totalLo = 2;
    totalHi = zone === "north_cold" || zone === "dry_north" ? 3 : 2;
  } else if (profile === "top" || profile === "bottom") {
    totalLo = isInfant ? 3 : age < 18 ? 3 : 2;
    totalHi = isInfant ? 4 : age < 18 ? 4 : 3;
  } else {
    totalLo = 2;
    totalHi = 3;
  }

  return splitPiecesAcrossSizes(buySizes, weights, totalLo, totalHi);
}

function garmentItem(
  category: string,
  size: string,
  profile: GarmentQtyProfile,
  params: QtyParams,
  tip?: string,
): GarmentAdviceItem {
  return {
    category,
    size,
    quantity: recommendQuantity(profile, params),
    tip,
  };
}

function buildGarmentListForSeason(
  season: SeasonKey,
  isInfant: boolean,
  peakAgeMonths: number,
  buySizes: SizeCode[],
  wearMonths: Map<SizeCode, number>,
  main: SizeCode,
  up: SizeCode,
  winterOuter: SizeCode,
  zone: ClimateZone,
  isWinter: boolean,
  winterBump: 0 | 1,
): GarmentAdviceItem[] {
  const qty: QtyParams = {
    peakAgeMonths,
    zone,
    season,
    buySizes,
    wearMonths,
    isInfant,
  };
  const bodySizes = fmtSizeList(buySizes);

  if (season === "summer") {
    const items: GarmentAdviceItem[] = isInfant
      ? [
          garmentItem("短袖连体 / 爬爬服", bodySizes, "daily_romper", qty, "贴身主力，按建议码分批"),
          garmentItem("包屁衣", bodySizes, "bodysuit", qty, "与连体错开换洗"),
          garmentItem("薄款长袖连体", fmtSize(main), "long_sleeve_base", qty, "空调房备用"),
        ]
      : [
          garmentItem("短袖 T 恤 / 背心", bodySizes, "top", qty, "季末码承担主力"),
          garmentItem("短裤 / 防蚊裤", bodySizes, "bottom", qty, "与上衣同码段"),
        ];
    items.push(
      garmentItem(
        "防晒衣 / 薄开衫",
        up !== main ? fmtSizeList([main, up]) : fmtSize(main),
        "outer_light",
        qty,
        zone === "hot_humid" ? "透气浅色，各 1 件" : "户外各 1 件",
      ),
    );
    items.push(
      garmentItem("袜子、遮阳帽", "均码 / 按头围", "accessory", qty, "随洗随换"),
    );
    return items;
  }

  if (season === "fall") {
    const items: GarmentAdviceItem[] = isInfant
      ? [
          garmentItem("长袖连体 / 哈衣", bodySizes, "daily_romper", qty, "换季打底"),
          garmentItem("薄卫衣连体", bodySizes, "top", qty, "季末码可多 1 件"),
          garmentItem("针织开衫", fmtSize(up), "cardigan", qty, "外穿各 1 件"),
        ]
      : [
          garmentItem("长袖打底 T", bodySizes, "top", qty, "贴身按建议码"),
          garmentItem("薄卫衣 / 开衫", fmtSize(up), "cardigan", qty, "外穿各 1 件"),
          garmentItem("长裤 / 打底裤", bodySizes, "bottom", qty, "与打底同码段"),
        ];
    if (zone === "yangtze" || zone === "southwest_mild" || zone === "north_cold") {
      items.push(
        garmentItem("薄外套 / 风衣", fmtSize(up), "outer_light", qty, "早晚外穿 1 件"),
      );
    }
    return items;
  }

  const items: GarmentAdviceItem[] = isInfant
    ? [
        garmentItem("加厚连体 / 夹棉哈衣", bodySizes, "inner_warm", qty, "室内贴身"),
        garmentItem("外出棉服 / 羽绒连体", fmtSize(winterOuter), "outer_heavy", qty, "外穿单码即可"),
        garmentItem("保暖帽、脚套", "均码 / 按头围", "accessory", qty, "出门防风"),
      ]
    : [
        garmentItem("毛衣 / 厚打底", bodySizes, "inner_warm", qty, "贴身按建议码"),
        garmentItem(
          "棉服 / 羽绒服",
          fmtSize(winterOuter),
          "outer_heavy",
          qty,
          winterBump ? "叠穿留松量，1 件为主" : "合身 1 件",
        ),
        garmentItem("厚长裤 / 加绒裤", bodySizes, "bottom", qty, "与打底同码段"),
      ];
  if (zone === "north_cold" || zone === "dry_north") {
    items.push(
      garmentItem("防风厚羽绒", fmtSize(winterOuter), "outer_heavy", qty, "极寒备用 1 件"),
    );
  } else if (zone === "hot_humid") {
    items.push(
      garmentItem("轻薄羽绒 / 可拆内胆", fmtSize(winterOuter), "outer_light", qty, "当地冬季短，1 件"),
    );
  }
  return items;
}

function compactWearPeriod(coveredMonths: string): string {
  if (coveredMonths === "—") return "—";
  const labels = coveredMonths.split("、").filter(Boolean);
  if (labels.length <= 1) return labels[0] ?? coveredMonths;
  const first = labels[0]!;
  const last = labels[labels.length - 1]!;
  const fy = first.match(/^(\d{4})年(\d{1,2})月$/);
  const ly = last.match(/^(\d{4})年(\d{1,2})月$/);
  if (fy && ly && fy[1] === ly[1]) {
    return `${fy[1]}年${fy[2]}–${ly[2]}月`;
  }
  return `${first}～${last}`;
}

/**
 * 按囤货穿着月数从季末往前分配自然月（与件数分摊一致）：
 * 较大码拿最后 N 个月，避免日历仍显示小码时把过渡码也标成整季。
 */
function buildWearPeriodBySizeForRows(
  rows: MonthProjection[],
  wearMonths: Map<SizeCode, number>,
  buySizes: SizeCode[] = [],
): Partial<Record<SizeCode, string>> {
  if (rows.length === 0) return {};

  const stocked =
    buySizes.length > 0
      ? buySizes.filter((s) => (wearMonths.get(s) ?? 0) > 0)
      : SIZE_CODES.filter((s) => (wearMonths.get(s) ?? 0) > 0);
  if (stocked.length === 0) return {};

  const labelsBySize = new Map<SizeCode, string[]>();
  let endIdx = rows.length - 1;
  for (let i = stocked.length - 1; i >= 0; i--) {
    const size = stocked[i]!;
    const n = wearMonths.get(size) ?? 0;
    const labels: string[] = [];
    for (let c = 0; c < n && endIdx >= 0; endIdx--, c++) {
      labels.unshift(rows[endIdx]!.label);
    }
    if (labels.length > 0) labelsBySize.set(size, labels);
  }

  const out: Partial<Record<SizeCode, string>> = {};
  for (const size of stocked) {
    const labels = labelsBySize.get(size);
    if (!labels?.length) continue;
    out[size] = compactWearPeriod(labels.join("、"));
  }
  return out;
}

/** 季末比日历主力大一档的过渡码（如防晒衣 100）：仅对应最后一月 */
function wearPeriodForSeasonUpSize(
  code: SizeCode,
  rows: MonthProjection[],
): string | null {
  if (rows.length === 0) return null;
  const calMax = rows.reduce((m, r) => maxSizeCode(m, r.size), rows[0]!.size);
  const up = nextSize(calMax);
  if (code !== up || sizeIndex(code) > sizeIndex(calMax) + 1) return null;
  return rows[rows.length - 1]!.label;
}

/** 按尺码日历「参考码」列统计各码出现的自然月（不做囤货并入） */
function buildCalendarWearPeriodBySize(
  rows: MonthProjection[],
): Partial<Record<SizeCode, string>> {
  const labelsBySize = new Map<SizeCode, string[]>();
  for (const row of rows) {
    const cur = labelsBySize.get(row.size) ?? [];
    if (!cur.includes(row.label)) cur.push(row.label);
    labelsBySize.set(row.size, cur);
  }
  const out: Partial<Record<SizeCode, string>> = {};
  for (const size of SIZE_CODES) {
    const labels = labelsBySize.get(size);
    if (!labels?.length) continue;
    out[size] = compactWearPeriod(labels.join("、"));
  }
  return out;
}

function parseSizeCodesFromSizeLabel(sizeLabel: string): SizeCode[] {
  const re =
    /(?:^|[、/\s])(52|59|66|73|80|90|100|110|120|130)(?=\s*码|[、\s/]|$)/g;
  const out: SizeCode[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sizeLabel)) !== null) {
    const n = Number(m[1]) as SizeCode;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

function wearPeriodForCode(
  code: SizeCode,
  wearPeriodBySize: Partial<Record<SizeCode, string>>,
  calendarWearPeriodBySize: Partial<Record<SizeCode, string>>,
  seasonFallback: string,
  seasonRows: MonthProjection[] = [],
): string {
  const merged = wearPeriodBySize[code];
  if (merged && merged !== "—") return merged;
  const cal = calendarWearPeriodBySize[code];
  if (cal && cal !== "—") return cal;
  const upPeriod = wearPeriodForSeasonUpSize(code, seasonRows);
  if (upPeriod) return upPeriod;
  return seasonFallback;
}

/** 购买清单一行：按号码列解析出码，优先囤货穿着月，其次日历参考码、季末过渡码 */
function resolveWearPeriodForPurchaseRow(
  sizeLabel: string,
  wearPeriodBySize: Partial<Record<SizeCode, string>>,
  calendarWearPeriodBySize: Partial<Record<SizeCode, string>>,
  seasonFallback: string,
  seasonRows: MonthProjection[] = [],
): string {
  if (/均码|头围/.test(sizeLabel)) return seasonFallback;
  const codes = parseSizeCodesFromSizeLabel(sizeLabel);
  if (codes.length === 0) return seasonFallback;
  if (codes.length === 1) {
    return wearPeriodForCode(
      codes[0]!,
      wearPeriodBySize,
      calendarWearPeriodBySize,
      seasonFallback,
      seasonRows,
    );
  }
  return codes
    .map((c) => {
      const p = wearPeriodForCode(
        c,
        wearPeriodBySize,
        calendarWearPeriodBySize,
        seasonFallback,
        seasonRows,
      );
      return `${c} 码约 ${p}`;
    })
    .join("；");
}

/** 将季内品类拆成「款式 + 号码 + 件数」行，供末尾购买清单使用 */
function expandGarmentToPurchaseRows(
  garment: GarmentAdviceItem,
  seasonFallback: string,
  wearPeriodBySize: Partial<Record<SizeCode, string>>,
  calendarWearPeriodBySize: Partial<Record<SizeCode, string>>,
  seasonRows: MonthProjection[],
): PurchaseListItem[] {
  const q = garment.quantity.trim();

  const plusParts = q.split(/\s*\+\s*/);
  if (plusParts.length > 1) {
    return plusParts.map((part) => {
      const trimmed = part.trim();
      const sized = trimmed.match(/^(.+?码(?:\s*\/\s*按头围)?)\s+(.+)$/);
      if (sized) {
        const sizeCol = sized[1]!.trim();
        return {
          style: garment.category,
          size: sizeCol,
          wearPeriod: resolveWearPeriodForPurchaseRow(
            sizeCol,
            wearPeriodBySize,
            calendarWearPeriodBySize,
            seasonFallback,
            seasonRows,
          ),
          quantity: sized[2]!.trim(),
        };
      }
      return {
        style: garment.category,
        size: garment.size,
        wearPeriod: resolveWearPeriodForPurchaseRow(
          garment.size,
          wearPeriodBySize,
          calendarWearPeriodBySize,
          seasonFallback,
          seasonRows,
        ),
        quantity: trimmed,
      };
    });
  }

  const eachParts = q.split(/[，,]/).map((s) => s.replace(/（.*?）$/, "").trim());
  if (eachParts.length > 1 && eachParts.some((p) => /各\s*\d/.test(p))) {
    return eachParts
      .filter((p) => p.length > 0)
      .map((part) => {
        const m = part.match(/^(.+?码)\s*各\s*(.+)$/);
        if (m) {
          const sizeCol = m[1]!.trim();
          return {
            style: garment.category,
            size: sizeCol,
            wearPeriod: resolveWearPeriodForPurchaseRow(
              sizeCol,
              wearPeriodBySize,
              calendarWearPeriodBySize,
              seasonFallback,
              seasonRows,
            ),
            quantity: `各 ${m[2]!.trim()}`,
          };
        }
        return {
          style: garment.category,
          size: garment.size,
          wearPeriod: resolveWearPeriodForPurchaseRow(
            garment.size,
            wearPeriodBySize,
            calendarWearPeriodBySize,
            seasonFallback,
            seasonRows,
          ),
          quantity: part,
        };
      });
  }

  return [
    {
      style: garment.category,
      size: garment.size,
      wearPeriod: resolveWearPeriodForPurchaseRow(
        garment.size,
        wearPeriodBySize,
        calendarWearPeriodBySize,
        seasonFallback,
        seasonRows,
      ),
      quantity: q,
    },
  ];
}

function buildPurchaseList(
  summer: SeasonAdviceDetail,
  fall: SeasonAdviceDetail,
  winter: SeasonAdviceDetail,
  now = new Date(),
): PurchaseListItem[] {
  const list: PurchaseListItem[] = [];
  const focus = resolvePurchaseListFocus(now, summer);
  const seasons: SeasonAdviceDetail[] =
    focus === "summer_618" ? [summer] : [summer, fall, winter];

  for (const season of seasons) {
    if (season.garments.length === 0) continue;
    const seasonFallback = compactWearPeriod(season.coveredMonths);
    for (const garment of season.garments) {
      list.push(
        ...expandGarmentToPurchaseRows(
          garment,
          seasonFallback,
          season.wearPeriodBySize,
          season.calendarWearPeriodBySize,
          season.monthRows,
        ),
      );
    }
  }

  return list;
}

export function computeBabySizeAdvice(input: BabyInput, now = new Date()): SizeAdvice {
  const birth = parseLocalDate(input.birthDate);
  const ageMonths = monthsBetween(birth, now);
  const provinceName = getProvinceName(input.provinceCode) ?? "上海市";
  const localityLabel = `${provinceName} · ${input.municipality}`;
  const { zone, label } = climateForLocality(provinceName, input.municipality);
  const projectionMode: HeightProjectionMode =
    input.heightProjectionMode ?? "who";

  const heightNow =
    input.heightCm && input.heightCm > 40
      ? projectionMode === "measured_anchor"
        ? Math.round(input.heightCm)
        : clampHeightToAgeBand(input.gender, ageMonths, input.heightCm)
      : whoInterpolateHeight(input.gender, ageMonths, input.percentileBand);
  const main = sizeFromHeightForCalendarRow(input.gender, ageMonths, ageMonths, heightNow);

  const nearestPercentileBand =
    input.heightCm && input.heightCm > 40
      ? getNearestPercentileBand(input.gender, ageMonths, input.heightCm)
      : null;

  const whoReferenceSummary: string | null = null;

  const winterBump: 0 | 1 =
    zone === "north_cold" || zone === "dry_north" ? 1 : zone === "hot_humid" ? 0 : 1;

  const calendarStartsFromDueMonth = isBirthDateAfterToday(birth, now);
  const calendarStartDate = calendarStartsFromDueMonth
    ? new Date(birth.getFullYear(), birth.getMonth(), 1)
    : now;

  const calendar: MonthProjection[] = [];
  for (let i = 0; i < 9; i++) {
    const d = addMonths(calendarStartDate, i);
    calendar.push(
      buildCalendarRow(
        birth,
        d,
        input.gender,
        input.percentileBand,
        input.heightCm && input.heightCm > 40 ? input.heightCm : null,
        now,
        ageMonths,
        projectionMode,
      ),
    );
  }

  const { summer, fall, winter } = buildSeasonalGarmentAdvice(
    calendar,
    birth,
    calendarStartDate,
    input.gender,
    input.percentileBand,
    input.heightCm && input.heightCm > 40 ? input.heightCm : null,
    now,
    zone,
    winterBump,
    now,
    ageMonths,
    projectionMode,
  );

  const purchaseListFocus = resolvePurchaseListFocus(now, summer);
  const purchaseList = buildPurchaseList(summer, fall, winter, now);
  const shoppingFocusNote = buildShoppingFocusNote(purchaseListFocus);

  const heightWeightWarning =
    input.heightCm && input.heightCm > 40 && input.weightKg && input.weightKg >= 2
      ? getHeightWeightWarning(input.birthDate, input.heightCm, input.weightKg, input.gender, now)
      : null;

  const regionalLivingHint = buildRegionalLivingHint(
    input.municipality,
    provinceName,
    zone,
    winter,
  );
  const climateZoneExplanation = buildClimateZoneExplanation(
    input.municipality,
    provinceName,
    zone,
  );

  const result: SizeAdvice = {
    ageMonths,
    currentMainSize: main,
    summer,
    fall,
    winter,
    purchaseList,
    purchaseListFocus,
    shoppingFocusNote,
    avoidStockpile: buildAvoidList(ageMonths, main, zone),
    calendar,
    climateZone: zone,
    climateLabel: label,
    localityLabel,
    whoReferenceSummary,
    nearestPercentileBand,
    calendarStartsFromDueMonth,
    disclaimer:
      "本结果身高轨迹参考 WHO 儿童生长标准（身长/身高）百分位示意，并结合月龄与城市气候做买衣建议；不同品牌版型差异大，下单前请对照具体尺码表。不构成医疗建议。",
    heightWeightWarning,
    measuredHeightNotice: measuredHeightResultNotice(
      projectionMode,
      input.heightCm && input.heightCm > 40 ? input.heightCm : null,
      input.heightCm && input.heightCm > 40 && projectionMode === "who"
        ? clampHeightToAgeBand(input.gender, ageMonths, input.heightCm)
        : null,
    ),
    heightProjectionMode: projectionMode,
    regionalLivingHint,
    climateZoneExplanation,
    brandSizingNote: BRAND_SIZING_NOTE,
    newbornParentTips: buildNewbornParentTips(ageMonths),
  };

  if (process.env.NODE_ENV === "development") {
    const sanityIssues = auditSizeAdvice(result, input.gender);
    if (sanityIssues.length > 0) {
      console.error(
        "[baby-size-calendar] 尺码自检未通过（开发环境）",
        sanityIssues,
      );
    }
  }

  return result;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + n);
  return x;
}
