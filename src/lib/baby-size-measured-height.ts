import type { Gender } from "@/lib/who-height-reference";
import { whoInterpolateHeight } from "@/lib/who-height-reference";

function softMaxHeightCm(gender: Gender, ageMonths: number): number {
  const age = Math.max(0, ageMonths);
  const p97 = whoInterpolateHeight(gender, age, "P97");
  const bump = age < 6 ? 7 : age < 12 ? 9 : age < 24 ? 11 : 13;
  return Math.round(p97 + bump);
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

export type HeightProjectionMode = "who" | "measured_anchor";

export function parseHeightTrustParam(
  raw: string | undefined,
): HeightProjectionMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "1" || v === "measured" || v === "anchor") return "measured_anchor";
  return "who";
}

export interface MeasuredHeightAssessment {
  rawHeightCm: number;
  ageMonths: number;
  birthMonthIsCurrent: boolean;
  whoP3: number;
  whoP97: number;
  softMaxCm: number;
  /** 超过 WHO 合理上限（原逻辑会静默压回上限） */
  exceedsSoftMax: boolean;
  /** 明显低于 P3 */
  belowP3Band: boolean;
  needsConfirmation: boolean;
  title: string;
  bodyLines: string[];
}

/**
 * 有实测身高且与当月 WHO 带相差较大时需用户确认；
 * 确认后走 measured_anchor：当前码按实测，未来按月增中位线外推。
 */
export function assessMeasuredHeight(
  birthDateYmd: string,
  gender: Gender,
  heightCm: number,
  birthMonthIsCurrent: boolean,
  now = new Date(),
): MeasuredHeightAssessment | null {
  if (!Number.isFinite(heightCm) || heightCm <= 40) return null;

  const birth = parseLocalDate(birthDateYmd);
  const ageMonths = monthsBetween(birth, now);
  const whoP3 = Math.round(whoInterpolateHeight(gender, ageMonths, "P3"));
  const whoP97 = Math.round(whoInterpolateHeight(gender, ageMonths, "P97"));
  const softMaxCm = softMaxHeightCm(gender, ageMonths);

  const exceedsSoftMax = heightCm > softMaxCm;
  const belowP3Band = heightCm < whoP3 - 8;

  const needsConfirmation =
    exceedsSoftMax ||
    belowP3Band ||
    (birthMonthIsCurrent && heightCm > whoP97 + 3);

  const title = exceedsSoftMax
    ? "身高超出 WHO 同月龄常见范围"
    : belowP3Band
      ? "身高明显低于 WHO 同月龄范围"
      : "请确认出生年月与身高";

  const bodyLines: string[] = [
    `您填写：出生${birthMonthIsCurrent ? "月份为当月" : `约 ${ageMonths} 月龄`}，身高 ${heightCm} cm。`,
    `WHO ${gender === "girl" ? "女童" : "男童"} ${ageMonths} 月龄常见约 ${whoP3}–${whoP97} cm（P3–P97），系统合理上限约 ${softMaxCm} cm。`,
  ];

  if (exceedsSoftMax) {
    bodyLines.push(
      "若数据无误：将按实测身高给出当前尺码，未来月份按「实测锚点 + WHO 月龄中位增速」推算（不再压回 WHO 上限）。",
    );
  } else if (birthMonthIsCurrent) {
    bodyLines.push(
      "出生月份为当月且身高已明显偏高时，请确认出生年月与测量是否正确。",
    );
  }

  if (belowP3Band) {
    bodyLines.push("若早产或测量方式不同，确认后可按实测推算。");
  }

  bodyLines.push("若填错，请返回修改出生年月或身高。");

  return {
    rawHeightCm: heightCm,
    ageMonths,
    birthMonthIsCurrent,
    whoP3,
    whoP97,
    softMaxCm,
    exceedsSoftMax,
    belowP3Band,
    needsConfirmation,
    title,
    bodyLines,
  };
}

export function measuredHeightResultNotice(
  mode: HeightProjectionMode,
  rawHeightCm: number | null,
  clampedDisplayCm: number | null,
): string | null {
  if (mode !== "measured_anchor" || rawHeightCm == null) return null;
  if (clampedDisplayCm != null && clampedDisplayCm === rawHeightCm) {
    return `已按您确认的实测身高 ${rawHeightCm} cm 计算当前尺码；未来 9 个月身高按「实测锚点 + WHO 月龄中位增速」外推（与纯 WHO 曲线可能不一致）。`;
  }
  return `已按您确认的实测身高 ${rawHeightCm} cm 推算；未来月份未再压回 WHO 上限。`;
}
