/**
 * 尺码结果自检：扫描建议输出中的衣码，确保不超过「当前月龄 + 上下文月龄」下的合理上限。
 */

import {
  SIZE_CODES,
  ageMonthsForSizeInference,
  maxSizeForAgeMonths,
  type Gender,
  type SizeAdvice,
  type SizeCode,
} from "@/lib/baby-size-calculator";

export interface SizeSanityIssue {
  /** 问题出现位置，便于定位 */
  source: string;
  code: SizeCode;
  maxAllowed: SizeCode;
  currentAgeMonths: number;
  contextAgeMonths: number;
}

function sizeIndex(s: SizeCode): number {
  return SIZE_CODES.indexOf(s);
}

/** 给定当前月龄与某行/某季上下文月龄，允许出现的最大衣码 */
export function maxAllowedSizeForContext(
  gender: Gender,
  currentAgeMonths: number,
  contextAgeMonths: number,
): SizeCode {
  const effective = ageMonthsForSizeInference(currentAgeMonths, contextAgeMonths);
  return maxSizeForAgeMonths(gender, effective);
}

const EXPLICIT_SIZE_RE =
  /(?:^|[、/\s])(52|59|66|73|80|90|100|110|120|130)(?=\s*码|[、\s/]|$)/g;

export function parseExplicitSizeCodes(text: string): SizeCode[] {
  const out: SizeCode[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(EXPLICIT_SIZE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]) as SizeCode;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

function pushIssue(
  issues: SizeSanityIssue[],
  seen: Set<string>,
  issue: SizeSanityIssue,
): void {
  const key = `${issue.source}|${issue.code}|${issue.contextAgeMonths}`;
  if (seen.has(key)) return;
  seen.add(key);
  issues.push(issue);
}

function checkCode(
  issues: SizeSanityIssue[],
  seen: Set<string>,
  gender: Gender,
  currentAgeMonths: number,
  contextAgeMonths: number,
  code: SizeCode,
  source: string,
): void {
  const maxAllowed = maxAllowedSizeForContext(gender, currentAgeMonths, contextAgeMonths);
  if (sizeIndex(code) > sizeIndex(maxAllowed)) {
    pushIssue(issues, seen, {
      source,
      code,
      maxAllowed,
      currentAgeMonths,
      contextAgeMonths,
    });
  }
}

function auditSeasonMaps(
  issues: SizeSanityIssue[],
  seen: Set<string>,
  gender: Gender,
  currentAgeMonths: number,
  seasonKey: string,
  wearPeriodBySize: Partial<Record<SizeCode, string>>,
  calendarWearPeriodBySize: Partial<Record<SizeCode, string>>,
  peakAgeMonths: number,
): void {
  const ctx = peakAgeMonths >= 0 ? peakAgeMonths : currentAgeMonths;
  for (const key of Object.keys(wearPeriodBySize)) {
    const code = Number(key) as SizeCode;
    if (SIZE_CODES.includes(code)) {
      checkCode(issues, seen, gender, currentAgeMonths, ctx, code, `${seasonKey}.wearPeriodBySize`);
    }
  }
  for (const key of Object.keys(calendarWearPeriodBySize)) {
    const code = Number(key) as SizeCode;
    if (SIZE_CODES.includes(code)) {
      checkCode(
        issues,
        seen,
        gender,
        currentAgeMonths,
        ctx,
        code,
        `${seasonKey}.calendarWearPeriodBySize`,
      );
    }
  }
}

function calendarPeakAgeMonths(advice: SizeAdvice): number {
  return advice.calendar.reduce((m, r) => Math.max(m, r.ageMonths), advice.ageMonths);
}

/** 扫描整份建议，返回所有超出月龄合理上限的衣码 */
export function auditSizeAdvice(advice: SizeAdvice, gender: Gender): SizeSanityIssue[] {
  const issues: SizeSanityIssue[] = [];
  const seen = new Set<string>();
  const cur = advice.ageMonths;
  const calPeak = calendarPeakAgeMonths(advice);

  checkCode(issues, seen, gender, cur, cur, advice.currentMainSize, "currentMainSize");

  for (const row of advice.calendar) {
    checkCode(issues, seen, gender, cur, row.ageMonths, row.size, `calendar:${row.label}`);
  }

  for (const season of ["summer", "fall", "winter"] as const) {
    const peak = calPeak;
    auditSeasonMaps(
      issues,
      seen,
      gender,
      cur,
      season,
      advice[season].wearPeriodBySize,
      advice[season].calendarWearPeriodBySize,
      peak,
    );

    for (const g of advice[season].garments) {
      for (const code of parseExplicitSizeCodes(g.size)) {
        checkCode(issues, seen, gender, cur, peak, code, `${season}.garment:${g.category}`);
      }
    }
  }

  for (const item of advice.purchaseList) {
    for (const code of parseExplicitSizeCodes(item.size)) {
      checkCode(issues, seen, gender, cur, calPeak, code, `purchaseList:${item.style}`);
    }
  }

  return issues;
}

export function formatSizeSanityIssues(issues: SizeSanityIssue[]): string {
  return issues
    .map(
      (i) =>
        `${i.source}: ${i.code} 码 > 允许上限 ${i.maxAllowed}（当前 ${i.currentAgeMonths} 月，上下文 ${i.contextAgeMonths} 月）`,
    )
    .join("\n");
}

/** 自检通过返回 null，否则返回错误说明 */
export function assertSizeAdviceSanity(
  advice: SizeAdvice,
  gender: Gender,
): string | null {
  const issues = auditSizeAdvice(advice, gender);
  if (issues.length === 0) return null;
  return formatSizeSanityIssues(issues);
}
